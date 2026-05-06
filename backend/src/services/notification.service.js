import { prisma } from '../config/prisma.js';

export async function notifyMany({ orgId, userIds, type, title, body, data }) {
  const unique = Array.from(new Set((userIds || []).filter(Boolean)));
  if (!unique.length) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      orgId,
      userId,
      type,
      title,
      body: body || null,
      data: data ?? undefined,
    })),
  });
}

export async function notifyOne({ orgId, userId, type, title, body, data }) {
  if (!userId) return;
  await prisma.notification.create({
    data: {
      orgId,
      userId,
      type,
      title,
      body: body || null,
      data: data ?? undefined,
    },
  });
}

export async function listNotifications({ orgId, userId, cursor, limit = 20 }) {
  const take = Math.min(50, Math.max(1, Number(limit) || 20));
  const items = await prisma.notification.findMany({
    where: { orgId, userId },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });

  const hasMore = items.length > take;
  const sliced = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? sliced[sliced.length - 1]?.id : null;

  const unreadCount = await prisma.notification.count({
    where: { orgId, userId, readAt: null },
  });

  return { items: sliced, nextCursor, unreadCount };
}

export async function markRead({ orgId, userId, id }) {
  const n = await prisma.notification.findFirst({ where: { id, orgId, userId } });
  if (!n) return null;
  if (n.readAt) return n;
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });
}

export async function markAllRead({ orgId, userId }) {
  await prisma.notification.updateMany({
    where: { orgId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

