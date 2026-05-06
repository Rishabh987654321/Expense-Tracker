import { prisma } from '../config/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { notifyOne } from './notification.service.js';

function canCreateType(type, role) {
  if (role === 'EMPLOYEE') return false;
  if (type === 'TRANSFER_ADMIN') return role === 'ADMIN';
  if (type === 'REQUEST_ADMIN_ACCESS') return role === 'ADMIN' || role === 'MANAGER';
  return false;
}

export async function listForUser({ orgId, userId }) {
  // Show requests created by me OR targeted at me.
  const items = await prisma.adminRequest.findMany({
    where: {
      orgId,
      OR: [{ createdById: userId }, { targetUserId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      targetUser: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return items.map(serializeAdminRequest);
}

export async function createRequest({ orgId, currentUser, type, targetUserId, note }) {
  if (!canCreateType(type, currentUser.role)) {
    throw new HttpError(403, 'Insufficient role');
  }
  if (!targetUserId) throw new HttpError(400, 'targetUserId is required');
  if (targetUserId === currentUser.userId) throw new HttpError(400, 'Cannot target yourself');

  const target = await prisma.user.findFirst({ where: { id: targetUserId, orgId } });
  if (!target) throw new HttpError(404, 'Target user not found');

  if (type === 'REQUEST_ADMIN_ACCESS' && target.role !== 'ADMIN') {
    throw new HttpError(400, 'Admin access requests must target an admin');
  }
  if (type === 'TRANSFER_ADMIN' && target.role === 'EMPLOYEE') {
    throw new HttpError(400, 'Employees cannot be made admin');
  }

  const existing = await prisma.adminRequest.findFirst({
    where: {
      orgId,
      type,
      status: 'PENDING',
      createdById: currentUser.userId,
      targetUserId,
    },
  });
  if (existing) throw new HttpError(409, 'A pending request already exists');

  const item = await prisma.adminRequest.create({
    data: {
      orgId,
      type,
      status: 'PENDING',
      createdById: currentUser.userId,
      targetUserId,
      note: note || null,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      targetUser: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await notifyOne({
    orgId,
    userId: targetUserId,
    type: 'ADMIN_REQUEST_CREATED',
    title:
      type === 'TRANSFER_ADMIN'
        ? `Admin transfer request from ${item.createdBy.name}`
        : `Admin access request from ${item.createdBy.name}`,
    body: note || `Open Team to review this request.`,
    data: {
      adminRequestId: item.id,
      requestType: type,
      fromUserId: currentUser.userId,
      fromUserName: item.createdBy.name,
    },
  });

  return serializeAdminRequest(item);
}

export async function cancelRequest({ orgId, currentUserId, id }) {
  const item = await prisma.adminRequest.findFirst({ where: { id, orgId } });
  if (!item) throw new HttpError(404, 'Request not found');
  if (item.createdById !== currentUserId) throw new HttpError(403, 'Only the creator can cancel');
  if (item.status !== 'PENDING') throw new HttpError(400, 'Only pending requests can be cancelled');

  const updated = await prisma.adminRequest.update({
    where: { id },
    data: { status: 'CANCELLED', decidedAt: new Date() },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      targetUser: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  return serializeAdminRequest(updated);
}

export async function decideRequest({ orgId, currentUser, id, decision }) {
  const item = await prisma.adminRequest.findFirst({
    where: { id, orgId },
    include: {
      createdBy: { select: { id: true, role: true, name: true, email: true } },
      targetUser: { select: { id: true, role: true, name: true, email: true } },
    },
  });
  if (!item) throw new HttpError(404, 'Request not found');
  if (item.status !== 'PENDING') throw new HttpError(400, 'Request is not pending');
  if (item.targetUserId !== currentUser.userId) throw new HttpError(403, 'Only the target user can decide');
  if (!['ACCEPTED', 'REJECTED'].includes(decision)) throw new HttpError(400, 'Invalid decision');

  const updated = await prisma.$transaction(async (tx) => {
    const reqUpdated = await tx.adminRequest.update({
      where: { id },
      data: { status: decision, decidedAt: new Date() },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        targetUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (decision === 'ACCEPTED') {
      if (reqUpdated.type === 'TRANSFER_ADMIN') {
        if (reqUpdated.targetUser.role === 'EMPLOYEE') {
          throw new HttpError(400, 'Employees cannot be made admin');
        }
        await tx.user.update({ where: { id: reqUpdated.targetUserId }, data: { role: 'ADMIN' } });
      }
      if (reqUpdated.type === 'REQUEST_ADMIN_ACCESS') {
        if (reqUpdated.createdBy.role === 'EMPLOYEE') {
          throw new HttpError(400, 'Employees cannot be made admin');
        }
        await tx.user.update({ where: { id: reqUpdated.createdById }, data: { role: 'ADMIN' } });
      }
    }

    // Prevent "no admin left" cases if your org previously had a single admin:
    // we don't auto-demote anyone here, so it's safe.
    return reqUpdated;
  });

  await notifyOne({
    orgId,
    userId: updated.createdById,
    type: 'ADMIN_REQUEST_DECIDED',
    title:
      updated.type === 'TRANSFER_ADMIN'
        ? `Admin transfer ${decision.toLowerCase()}`
        : `Admin access request ${decision.toLowerCase()}`,
    body: `Decided by ${updated.targetUser.name}.`,
    data: {
      adminRequestId: updated.id,
      status: updated.status,
      requestType: updated.type,
      decidedByUserId: updated.targetUserId,
      decidedByName: updated.targetUser.name,
    },
  });

  return serializeAdminRequest(updated);
}

export function serializeAdminRequest(r) {
  return {
    id: r.id,
    orgId: r.orgId,
    type: r.type,
    status: r.status,
    note: r.note,
    decidedAt: r.decidedAt,
    createdAt: r.createdAt,
    createdBy: r.createdBy,
    targetUser: r.targetUser,
  };
}

