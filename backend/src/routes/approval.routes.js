import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import * as approvalService from '../services/approval.service.js';

const router = Router();
router.use(
  requireTenant,
  requireAuth,
  enterTenantContext,
  requireRole('ADMIN', 'MANAGER')
);

router.get('/pending', async (req, res, next) => {
  try {
    const items = await approvalService.listPending({
      orgId: req.user.orgId,
      excludeSubmitterId: req.user.userId,
    });
    res.json({ items });
  } catch (err) { next(err); }
});

const decisionSchema = z.object({ note: z.string().max(1000).optional() });

router.post('/:id/approve', async (req, res, next) => {
  try {
    const { note } = decisionSchema.parse(req.body || {});
    const result = await approvalService.approve({
      id: req.params.id,
      note,
      currentUser: req.user,
      tenant: req.tenant,
    });
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/reject', async (req, res, next) => {
  try {
    const { note } = decisionSchema.parse(req.body || {});
    const result = await approvalService.reject({
      id: req.params.id,
      note,
      currentUser: req.user,
      tenant: req.tenant,
    });
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
