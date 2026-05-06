import { prisma } from '../config/prisma.js';
import { generateInviteToken } from './auth.service.js';
import { HttpError } from '../middleware/errorHandler.js';
import env from '../config/env.js';
import { enqueueEmail } from '../queues/email.queue.js';
import { notifyInviteRevokedForAdmins } from './inviteNotifications.service.js';

export async function createInvite({ tenant, currentUser, email, role }) {
  const lowerEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { orgId_email: { orgId: tenant.orgId, email: lowerEmail } },
  });
  if (existingUser) {
    throw new HttpError(409, 'A user with that email already exists in your org');
  }

  const inviter = await prisma.user.findUnique({
    where: { id: currentUser.userId },
    select: { name: true, email: true },
  });

  const pending = await prisma.invite.findFirst({
    where: { email: lowerEmail, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (pending) throw new HttpError(409, 'An active invite already exists for this email');

  const { raw, hash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + env.INVITE_TTL_HOURS * 60 * 60 * 1000);

  const invite = await prisma.invite.create({
    data: {
      orgId: tenant.orgId,
      email: lowerEmail,
      role,
      tokenHash: hash,
      expiresAt,
    },
  });

  const acceptUrl = `${env.PUBLIC_APP_URL}/invite/${raw}`;

  await enqueueEmail('invite', {
    to: lowerEmail,
    orgName: tenant.orgName,
    invitedByName: inviter?.name || 'an admin',
    acceptUrl,
    role,
  });

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt,
    acceptUrl, // only returned to the inviting admin (not stored anywhere)
  };
}

export async function listInvites({ orgId }) {
  return prisma.invite.findMany({
    where: { orgId, acceptedAt: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
  });
}

export async function revokeInvite({ orgId, id }) {
  const invite = await prisma.invite.findFirst({ where: { orgId, id } });
  if (!invite) throw new HttpError(404, 'Invite not found');
  const invitedEmail = invite.email;
  await prisma.invite.delete({ where: { id } });
  try {
    await notifyInviteRevokedForAdmins({ orgId, invitedEmail });
  } catch (err) {
    console.warn('[revoke-invite] notifications:', err?.message);
  }
}
