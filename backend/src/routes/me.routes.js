import { Router } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import { uploadAvatar } from '../middleware/upload.js';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { uploadAvatar as uploadAvatarBlob, deleteAvatar, generateAvatarReadUrl, isBlobConfigured } from '../config/blob.js';

const router = Router();
router.use(requireTenant, requireAuth, enterTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, orgId: req.user.orgId },
      select: { id: true, email: true, name: true, role: true, avatarKey: true, createdAt: true },
    });
    if (!user) throw new HttpError(404, 'User not found');
    res.json({
      user: {
        ...user,
        avatarUrl: user.avatarKey ? generateAvatarReadUrl(user.avatarKey) : null,
      },
    });
  } catch (err) { next(err); }
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
});

router.patch('/', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(data.name ? { name: data.name } : {}),
      },
      select: { id: true, email: true, name: true, role: true, avatarKey: true },
    });
    res.json({
      user: {
        ...updated,
        avatarUrl: updated.avatarKey ? generateAvatarReadUrl(updated.avatarKey) : null,
      },
    });
  } catch (err) { next(err); }
});

router.post('/avatar', uploadAvatar, async (req, res, next) => {
  try {
    if (!req.file) throw new HttpError(400, 'Missing avatar file');
    if (!isBlobConfigured()) {
      throw new HttpError(503, 'Avatar uploads are not configured (AZURE_STORAGE_CONNECTION_STRING missing)');
    }

    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, orgId: req.user.orgId },
      select: { avatarKey: true },
    });
    if (!user) throw new HttpError(404, 'User not found');

    const ext = req.file.mimetype === 'image/png'
      ? 'png'
      : req.file.mimetype === 'image/webp'
        ? 'webp'
        : 'jpg';
    const id = crypto.randomUUID();
    const avatarKey = `${req.user.orgId}/avatar-${req.user.userId}-${id}.${ext}`;

    await uploadAvatarBlob({
      buffer: req.file.buffer,
      contentType: req.file.mimetype,
      blobPath: avatarKey,
    });

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { avatarKey },
      select: { id: true, email: true, name: true, role: true, avatarKey: true },
    });

    if (user.avatarKey && user.avatarKey !== avatarKey) {
      await deleteAvatar(user.avatarKey);
    }

    res.json({
      user: {
        ...updated,
        avatarUrl: updated.avatarKey ? generateAvatarReadUrl(updated.avatarKey) : null,
      },
    });
  } catch (err) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('invalid accountkey')) {
      return next(new HttpError(503, 'Avatar uploads are misconfigured (invalid AZURE_STORAGE_CONNECTION_STRING AccountKey)'));
    }
    return next(err);
  }
});

router.delete('/avatar', async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user.userId, orgId: req.user.orgId },
      select: { avatarKey: true, id: true, email: true, name: true, role: true },
    });
    if (!user) throw new HttpError(404, 'User not found');

    if (user.avatarKey) {
      await deleteAvatar(user.avatarKey);
    }

    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data: { avatarKey: null },
      select: { id: true, email: true, name: true, role: true, avatarKey: true },
    });

    res.json({
      user: {
        ...updated,
        avatarUrl: null,
      },
    });
  } catch (err) { next(err); }
});

export default router;

