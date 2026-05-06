import crypto from 'node:crypto';
import { prisma } from '../config/prisma.js';
import {
  uploadReceipt,
  deleteReceipt,
  generateReceiptReadUrl,
  isBlobConfigured,
} from '../config/blob.js';
import { HttpError } from '../middleware/errorHandler.js';
import { enqueueEmail } from '../queues/email.queue.js';
import { notifyMany, notifyOne } from './notification.service.js';

function formatMoney(cents, currency) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format((cents || 0) / 100);
  } catch {
    return `${(cents || 0) / 100} ${currency || ''}`.trim();
  }
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export async function createExpense({
  tenant,
  currentUser,
  data,
  file,
}) {
  let receiptKey = null;

  if (file) {
    if (!isBlobConfigured()) {
      throw new HttpError(503, 'Receipt uploads are not configured (AZURE_STORAGE_CONNECTION_STRING missing)');
    }
    const ext = EXT_BY_MIME[file.mimetype] || 'bin';
    const id = crypto.randomUUID();
    receiptKey = `${tenant.orgId}/${id}.${ext}`;
    try {
      await uploadReceipt({ buffer: file.buffer, contentType: file.mimetype, blobPath: receiptKey });
    } catch (err) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('invalid accountkey')) {
        throw new HttpError(
          503,
          'Receipt uploads are misconfigured (invalid AZURE_STORAGE_CONNECTION_STRING AccountKey)'
        );
      }
      throw new HttpError(503, 'Receipt upload failed. Check AZURE_STORAGE_CONNECTION_STRING and AZURE_BLOB_CONTAINER.');
    }
  }

  const expense = await prisma.expense.create({
    data: {
      orgId: tenant.orgId,
      submitterId: currentUser.userId,
      amountCents: data.amountCents,
      currency: data.currency,
      category: data.category,
      description: data.description,
      expenseDate: new Date(data.expenseDate),
      receiptKey,
    },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
    },
  });

  // Notify all managers + admins.
  const recipients = await prisma.user.findMany({
    where: { orgId: tenant.orgId, role: { in: ['ADMIN', 'MANAGER'] } },
    select: { id: true, email: true, name: true },
  });

  await enqueueEmail('expense-submitted', {
    to: recipients.map((r) => r.email),
    orgId: tenant.orgId,
    notifyUserIds: recipients.map((r) => r.id),
    orgName: tenant.orgName,
    submitterName: expense.submitter.name,
    amountCents: expense.amountCents,
    currency: expense.currency,
    category: expense.category,
    description: expense.description,
    expenseId: expense.id,
    tenantSlug: tenant.slug,
  });

  await notifyMany({
    orgId: tenant.orgId,
    userIds: recipients.map((r) => r.id),
    type: 'EXPENSE_SUBMITTED',
    title: `New expense: ${formatMoney(expense.amountCents, expense.currency)} · ${expense.category}`,
    body: `${expense.submitter.name}: ${expense.description}`,
    data: {
      expenseId: expense.id,
      submitterId: expense.submitterId,
      submitterName: expense.submitter.name,
      amountCents: expense.amountCents,
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
    },
  });

  return serializeExpense(expense);
}

const FILTER_KEYS = ['from', 'to', 'category', 'status', 'submitterId', 'q'];

export function buildExpenseFilters(query, currentUser) {
  const where = {};
  if (query.from) where.expenseDate = { ...where.expenseDate, gte: new Date(query.from) };
  if (query.to)   where.expenseDate = { ...where.expenseDate, lte: new Date(query.to) };
  if (query.category) where.category = query.category;
  if (query.status)   where.status   = query.status;
  if (query.submitterId) where.submitterId = query.submitterId;
  if (query.q) where.description = { contains: query.q, mode: 'insensitive' };

  // Employees only see their own expenses.
  if (currentUser.role === 'EMPLOYEE') where.submitterId = currentUser.userId;

  return where;
}

export async function listExpenses({ currentUser, query }) {
  const where = buildExpenseFilters(query, currentUser);
  // Enforce tenant scoping without relying on RLS/ALS.
  where.orgId = currentUser.orgId;
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { submitter: { select: { id: true, name: true, email: true } } },
      orderBy: { expenseDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items: items.map(serializeExpense),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getExpense({ id, currentUser }) {
  const expense = await prisma.expense.findFirst({
    where: { id, orgId: currentUser.orgId },
    include: {
      submitter: { select: { id: true, name: true, email: true } },
      approvals: {
        include: { approver: { select: { id: true, name: true, email: true } } },
        orderBy: { decidedAt: 'desc' },
      },
    },
  });
  if (!expense) throw new HttpError(404, 'Expense not found');
  if (currentUser.role === 'EMPLOYEE' && expense.submitterId !== currentUser.userId) {
    throw new HttpError(403, 'You can only view your own expenses');
  }
  const result = serializeExpense(expense);
  if (expense.receiptKey) result.receiptUrl = generateReceiptReadUrl(expense.receiptKey);
  result.approvals = expense.approvals.map((a) => ({
    id: a.id,
    decision: a.decision,
    note: a.note,
    decidedAt: a.decidedAt,
    approver: a.approver,
  }));
  return result;
}

export async function deleteExpense({ id, currentUser }) {
  const expense = await prisma.expense.findFirst({
    where: { id, orgId: currentUser.orgId },
    include: { submitter: { select: { id: true, name: true, email: true } } },
  });
  if (!expense) throw new HttpError(404, 'Expense not found');
  if (expense.status !== 'PENDING') throw new HttpError(400, 'Only pending expenses can be deleted');
  if (currentUser.role === 'EMPLOYEE' && expense.submitterId !== currentUser.userId) {
    throw new HttpError(403, 'You can only delete your own expenses');
  }

  const deleter = await prisma.user.findFirst({
    where: { id: currentUser.userId, orgId: currentUser.orgId },
    select: { id: true, name: true, email: true, role: true },
  });

  await prisma.expense.delete({ where: { id } });
  if (expense.receiptKey) await deleteReceipt(expense.receiptKey);

  await notifyOne({
    orgId: currentUser.orgId,
    userId: expense.submitterId,
    type: 'EXPENSE_REJECTED',
    title: `Expense deleted: ${formatMoney(expense.amountCents, expense.currency)} · ${expense.category}`,
    body: `${expense.description} — Deleted by ${deleter?.name || 'a user'}`,
    data: {
      expenseId: expense.id,
      deletedByUserId: currentUser.userId,
      deletedByName: deleter?.name || null,
      deletedByRole: deleter?.role || null,
      amountCents: expense.amountCents,
      currency: expense.currency,
      category: expense.category,
      description: expense.description,
    },
  });
}

export function serializeExpense(e) {
  return {
    id: e.id,
    amountCents: e.amountCents,
    currency: e.currency,
    category: e.category,
    description: e.description,
    expenseDate: e.expenseDate,
    status: e.status,
    receiptKey: e.receiptKey,
    hasReceipt: Boolean(e.receiptKey),
    receiptUrl: e.receiptKey ? generateReceiptReadUrl(e.receiptKey) : null,
    createdAt: e.createdAt,
    submitter: e.submitter,
  };
}

export { FILTER_KEYS };
