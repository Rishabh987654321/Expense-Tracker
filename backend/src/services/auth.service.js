import crypto from 'node:crypto';
import { adminPrisma, withTenant, prisma } from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signAuthToken } from '../utils/jwt.js';
import { HttpError } from '../middleware/errorHandler.js';
import env from '../config/env.js';
import { clearSlugCache } from '../middleware/tenantContext.js';
import { generateAvatarReadUrl } from '../config/blob.js';
import {
  notifyInviteAcceptedForAdmins,
  notifyNewTeamMemberToAll,
} from './inviteNotifications.service.js';

const SLUG_REGEX = /^[a-z][a-z0-9-]{1,31}$/;

export async function signupOrg({ orgName, slug, name, email, password }) {
  const lowerSlug = String(slug || '').toLowerCase();
  if (!SLUG_REGEX.test(lowerSlug)) {
    throw new HttpError(400, 'Slug must be 2-32 chars, start with a letter, and only contain a-z 0-9 -');
  }
  if (env.reservedSubdomains.includes(lowerSlug)) {
    throw new HttpError(400, `Slug "${lowerSlug}" is reserved`);
  }

  const existing = await adminPrisma.organization.findUnique({ where: { slug: lowerSlug } });
  if (existing) throw new HttpError(409, 'Slug already in use');

  const passwordHash = await hashPassword(password);

  const result = await adminPrisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { slug: lowerSlug, name: orgName },
    });
    const user = await tx.user.create({
      data: {
        orgId: org.id,
        email: email.toLowerCase(),
        passwordHash,
        name,
        role: 'ADMIN',
      },
    });
    return { org, user };
  });

  const token = signAuthToken({
    userId: result.user.id,
    orgId: result.org.id,
    role: result.user.role,
  });

  return {
    token,
    org: { id: result.org.id, slug: result.org.slug, name: result.org.name },
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      avatarUrl: result.user.avatarKey ? generateAvatarReadUrl(result.user.avatarKey) : null,
    },
    redirectUrl: env.TENANT_APP_URL.replace('{slug}', lowerSlug),
  };
}

export async function login({ tenant, email, password }) {
  if (!tenant) throw new HttpError(404, 'Unknown organization (subdomain)');

  const user = await adminPrisma.user.findUnique({
    where: { orgId_email: { orgId: tenant.orgId, email: email.toLowerCase() } },
  });
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  const token = signAuthToken({
    userId: user.id,
    orgId: tenant.orgId,
    role: user.role,
  });

  return {
    token,
    org: { id: tenant.orgId, slug: tenant.slug, name: tenant.orgName },
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarKey ? generateAvatarReadUrl(user.avatarKey) : null,
    },
  };
}

export async function getMe({ orgId, userId }) {
  return withTenant({ orgId, userId, role: 'EMPLOYEE' }, async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, orgId: true, avatarKey: true },
    });
    if (!user) throw new HttpError(404, 'User not found');
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, slug: true, name: true },
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
        avatarUrl: user.avatarKey ? generateAvatarReadUrl(user.avatarKey) : null,
      },
      org,
    };
  });
}

export function hashInviteToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateInviteToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: hashInviteToken(raw) };
}

export async function acceptInvite({ token, name, password }) {
  const tokenHash = hashInviteToken(token);
  const invite = await adminPrisma.invite.findUnique({
    where: { tokenHash },
    include: { org: true },
  });
  if (!invite) throw new HttpError(404, 'Invite not found');
  if (invite.acceptedAt) throw new HttpError(409, 'Invite already used');
  if (invite.expiresAt < new Date()) throw new HttpError(410, 'Invite expired');

  const existing = await adminPrisma.user.findUnique({
    where: { orgId_email: { orgId: invite.orgId, email: invite.email } },
  });
  if (existing) throw new HttpError(409, 'A user with this email already exists in this organization');

  const passwordHash = await hashPassword(password);

  const result = await adminPrisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        orgId: invite.orgId,
        email: invite.email,
        passwordHash,
        name,
        role: invite.role,
      },
    });
    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    return user;
  });

  clearSlugCache();

  try {
    await notifyInviteAcceptedForAdmins({
      orgId: invite.orgId,
      newUserName: result.name,
      newUserEmail: result.email,
    });
    await notifyNewTeamMemberToAll({
      orgId: invite.orgId,
      newUserId: result.id,
      newUserName: result.name,
      newUserEmail: result.email,
    });
  } catch (err) {
    console.warn('[accept-invite] notifications:', err?.message);
  }

  const authToken = signAuthToken({
    userId: result.id,
    orgId: invite.orgId,
    role: result.role,
  });

  return {
    token: authToken,
    org: { id: invite.org.id, slug: invite.org.slug, name: invite.org.name },
    user: { id: result.id, email: result.email, name: result.name, role: result.role },
    redirectUrl: env.TENANT_APP_URL.replace('{slug}', invite.org.slug),
  };
}
