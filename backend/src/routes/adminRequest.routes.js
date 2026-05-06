import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import * as adminRequestService from '../services/adminRequest.service.js';

const router = Router();
router.use(requireTenant, requireAuth, enterTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const items = await adminRequestService.listForUser({
      orgId: req.user.orgId,
      userId: req.user.userId,
    });
    res.json({ items });
  } catch (err) { next(err); }
});

const createSchema = z.object({
  type: z.enum(['TRANSFER_ADMIN', 'REQUEST_ADMIN_ACCESS']),
  targetUserId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const item = await adminRequestService.createRequest({
      orgId: req.user.orgId,
      currentUser: req.user,
      type: data.type,
      targetUserId: data.targetUserId,
      note: data.note,
    });
    res.status(201).json({ item });
  } catch (err) { next(err); }
});

const decideSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED']),
});

router.post('/:id/decide', async (req, res, next) => {
  try {
    const { decision } = decideSchema.parse(req.body);
    const item = await adminRequestService.decideRequest({
      orgId: req.user.orgId,
      currentUser: req.user,
      id: req.params.id,
      decision,
    });
    res.json({ item });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const item = await adminRequestService.cancelRequest({
      orgId: req.user.orgId,
      currentUserId: req.user.userId,
      id: req.params.id,
    });
    res.json({ item });
  } catch (err) { next(err); }
});

export default router;

