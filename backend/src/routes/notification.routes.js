import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import * as notificationService from '../services/notification.service.js';

const router = Router();
router.use(requireTenant, requireAuth, enterTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const { cursor, limit } = req.query;
    const result = await notificationService.listNotifications({
      orgId: req.user.orgId,
      userId: req.user.userId,
      cursor: cursor ? String(cursor) : null,
      limit: limit ? Number(limit) : 20,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    const item = await notificationService.markRead({
      orgId: req.user.orgId,
      userId: req.user.userId,
      id: req.params.id,
    });
    res.json({ item });
  } catch (err) { next(err); }
});

router.post('/read-all', async (req, res, next) => {
  try {
    await notificationService.markAllRead({
      orgId: req.user.orgId,
      userId: req.user.userId,
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;

