import { prisma } from '../config/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { notifyOne } from './notification.service.js';

export async function listUsers({ orgId }) {
  return prisma.user.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function updateUserRole({ orgId, id, role, currentUserId }) {
  const user = await prisma.user.findFirst({ where: { orgId, id } });
  if (!user) throw new HttpError(404, 'User not found');

  // Don't allow demoting the last admin.
  if (user.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { orgId, role: 'ADMIN' } });
    if (adminCount <= 1) throw new HttpError(400, 'Cannot demote the last admin');
  }

  // Prevent self-lockout (admin can't change their own role here).
  if (id === currentUserId && role !== 'ADMIN') {
    throw new HttpError(400, 'You cannot change your own admin role');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });

  await notifyOne({
    orgId,
    userId: id,
    type: 'ROLE_UPDATED',
    title: 'Your role was updated',
    body: `Your role is now ${updated.role}.`,
    data: { role: updated.role },
  });

  return updated;
}

export async function deleteUser({ orgId, id, currentUserId }) {
  if (id === currentUserId) throw new HttpError(400, 'You cannot delete yourself');
  const user = await prisma.user.findFirst({ where: { orgId, id } });
  if (!user) throw new HttpError(404, 'User not found');
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { orgId, role: 'ADMIN' } });
    if (adminCount <= 1) throw new HttpError(400, 'Cannot delete the last admin');
  }
  await prisma.user.delete({ where: { id } });
}
