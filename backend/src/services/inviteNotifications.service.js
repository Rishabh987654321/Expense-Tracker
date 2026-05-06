import { prisma } from '../config/prisma.js';
import { notifyMany } from './notification.service.js';

export async function notifyInviteAcceptedForAdmins({ orgId, newUserName, newUserEmail }) {
  const admins = await prisma.user.findMany({
    where: { orgId, role: 'ADMIN' },
    select: { id: true },
  });
  const ids = admins.map((a) => a.id);
  if (!ids.length) return;
  await notifyMany({
    orgId,
    userIds: ids,
    type: 'INVITE_ACCEPTED',
    title: 'Invite accepted',
    body: `${newUserName} (${newUserEmail}) accepted their invitation and joined the organization.`,
    data: { kind: 'invite', outcome: 'accepted', newUserName, newUserEmail },
  });
}

export async function notifyNewTeamMemberToAll({ orgId, newUserId, newUserName, newUserEmail }) {
  const members = await prisma.user.findMany({
    where: { orgId },
    select: { id: true },
  });
  const ids = members.map((u) => u.id);
  if (!ids.length) return;
  await notifyMany({
    orgId,
    userIds: ids,
    type: 'NEW_TEAM_MEMBER',
    title: `New team member: ${newUserName}`,
    body: newUserEmail,
    data: {
      kind: 'team',
      navigateTo: 'team',
      newUserId,
      newUserName,
      newUserEmail,
    },
  });
}

export async function notifyInviteRevokedForAdmins({ orgId, invitedEmail }) {
  const admins = await prisma.user.findMany({
    where: { orgId, role: 'ADMIN' },
    select: { id: true },
  });
  const ids = admins.map((a) => a.id);
  if (!ids.length) return;
  await notifyMany({
    orgId,
    userIds: ids,
    type: 'INVITE_REVOKED',
    title: 'Invite cancelled',
    body: `Pending invite for ${invitedEmail} was removed before it was accepted.`,
    data: { kind: 'invite', outcome: 'revoked', invitedEmail },
  });
}
