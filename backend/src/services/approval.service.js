import { prisma } from '../config/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { enqueueEmail } from '../queues/email.queue.js';
import { serializeExpense } from './expense.service.js';
import { notifyOne } from './notification.service.js';

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

export async function listPending({ orgId, excludeSubmitterId }) {
  const items = await prisma.expense.findMany({
    where: {
      orgId,
      status: 'PENDING',
      ...(excludeSubmitterId ? { submitterId: { not: excludeSubmitterId } } : {}),
    },
    include: { submitter: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return items.map(serializeExpense);
}

async function decide({ id, decision, note, currentUser, tenant }) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    throw new HttpError(400, 'Invalid decision');
  }

  const expense = await prisma.expense.findFirst({
    where: { id, orgId: tenant.orgId },
    include: { submitter: { select: { id: true, name: true, email: true } } },
  });
  if (!expense) throw new HttpError(404, 'Expense not found');
  if (expense.status !== 'PENDING') throw new HttpError(400, 'Expense is not pending');
  if (expense.submitterId === currentUser.userId) {
    throw new HttpError(400, 'You cannot decide on your own expense');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const e = await tx.expense.update({
      where: { id },
      data: { status: decision },
      include: { submitter: { select: { id: true, name: true, email: true } } },
    });
    await tx.approval.create({
      data: {
        orgId: e.orgId,
        expenseId: e.id,
        approverId: currentUser.userId,
        decision,
        note: note || null,
      },
    });
    return e;
  });

  await enqueueEmail('expense-decision', {
    to: updated.submitter.email,
    orgId: tenant.orgId,
    notifyUserIds: [updated.submitterId],
    submitterName: updated.submitter.name,
    orgName: tenant.orgName,
    decision,
    note: note || null,
    amountCents: updated.amountCents,
    currency: updated.currency,
    description: updated.description,
    expenseId: updated.id,
    tenantSlug: tenant.slug,
  });

  await notifyOne({
    orgId: tenant.orgId,
    userId: updated.submitterId,
    type: decision === 'APPROVED' ? 'EXPENSE_APPROVED' : 'EXPENSE_REJECTED',
    title:
      (decision === 'APPROVED' ? 'Approved' : 'Rejected') +
      `: ${formatMoney(updated.amountCents, updated.currency)} · ${updated.category}`,
    body: `${updated.description}${note ? ` — Note: ${note}` : ''}`,
    data: {
      expenseId: updated.id,
      decision,
      amountCents: updated.amountCents,
      currency: updated.currency,
      category: updated.category,
      description: updated.description,
      note: note || null,
    },
  });

  return serializeExpense(updated);
}

export const approve = (args) => decide({ ...args, decision: 'APPROVED' });
export const reject  = (args) => decide({ ...args, decision: 'REJECTED' });
