import { prisma } from '../config/prisma.js';

function defaultRange() {
  const now = new Date();
  const from = new Date(now);
  from.setMonth(from.getMonth() - 11);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);
  return { from, to: now };
}

function parseRange(query) {
  const def = defaultRange();
  const from = query.from ? new Date(query.from) : def.from;
  const to   = query.to   ? new Date(query.to)   : def.to;
  return { from, to };
}

function approvedFilter({ from, to, includePending, submitterId }) {
  return {
    expenseDate: { gte: from, lte: to },
    ...(includePending ? {} : { status: 'APPROVED' }),
    ...(submitterId ? { submitterId } : {}),
  };
}

export async function summary({ query, orgId, submitterId }) {
  const { from, to } = parseRange(query);

  const [totalApproved, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.expense.aggregate({
      where: { orgId, ...approvedFilter({ from, to, submitterId }) },
      _sum: { amountCents: true },
    }),
    prisma.expense.count({ where: { orgId, status: 'PENDING', ...(submitterId ? { submitterId } : {}) } }),
    prisma.expense.count({ where: { orgId, status: 'APPROVED', expenseDate: { gte: from, lte: to }, ...(submitterId ? { submitterId } : {}) } }),
    prisma.expense.count({ where: { orgId, status: 'REJECTED', expenseDate: { gte: from, lte: to }, ...(submitterId ? { submitterId } : {}) } }),
  ]);

  return {
    range: { from, to },
    totalApprovedCents: totalApproved._sum.amountCents || 0,
    counts: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
  };
}

export async function byCategory({ query, orgId, submitterId }) {
  const { from, to } = parseRange(query);
  const rows = await prisma.expense.groupBy({
    by: ['category'],
    where: { orgId, ...approvedFilter({ from, to, submitterId }) },
    _sum: { amountCents: true },
    _count: { _all: true },
  });
  return {
    range: { from, to },
    items: rows.map((r) => ({
      category: r.category,
      totalCents: r._sum.amountCents || 0,
      count: r._count._all,
    })).sort((a, b) => b.totalCents - a.totalCents),
  };
}

export async function byUser({ query, orgId, submitterId }) {
  const { from, to } = parseRange(query);
  const rows = await prisma.expense.groupBy({
    by: ['submitterId'],
    where: { orgId, ...approvedFilter({ from, to, submitterId }) },
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  const users = await prisma.user.findMany({
    where: { orgId, id: { in: rows.map((r) => r.submitterId) } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    range: { from, to },
    items: rows
      .map((r) => ({
        userId: r.submitterId,
        name: userMap.get(r.submitterId)?.name || 'Unknown',
        email: userMap.get(r.submitterId)?.email || null,
        totalCents: r._sum.amountCents || 0,
        count: r._count._all,
      }))
      .sort((a, b) => b.totalCents - a.totalCents),
  };
}

// Postgres date_trunc month groupings via raw SQL — Prisma's groupBy on a
// derived expression is awkward. RLS still applies because the query runs
// inside the tenant context transaction.
export async function byMonth({ query, orgId, submitterId }) {
  const { from, to } = parseRange(query);
  const rows = submitterId
    ? await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', "expenseDate"), 'YYYY-MM') AS month,
               SUM("amountCents")::bigint AS total_cents,
               COUNT(*)::int AS count
          FROM "Expense"
         WHERE "status" = 'APPROVED'
           AND "orgId" = ${orgId}
           AND "submitterId" = ${submitterId}
           AND "expenseDate" >= ${from}
           AND "expenseDate" <= ${to}
         GROUP BY 1
         ORDER BY 1 ASC
      `
    : await prisma.$queryRaw`
        SELECT to_char(date_trunc('month', "expenseDate"), 'YYYY-MM') AS month,
               SUM("amountCents")::bigint AS total_cents,
               COUNT(*)::int AS count
          FROM "Expense"
         WHERE "status" = 'APPROVED'
           AND "orgId" = ${orgId}
           AND "expenseDate" >= ${from}
           AND "expenseDate" <= ${to}
         GROUP BY 1
         ORDER BY 1 ASC
      `;
  return {
    range: { from, to },
    items: rows.map((r) => ({
      month: r.month,
      totalCents: Number(r.total_cents || 0),
      count: Number(r.count || 0),
    })),
  };
}
