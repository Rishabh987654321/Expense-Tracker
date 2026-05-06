import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import * as inviteService from '../services/invite.service.js';

const router = Router();
router.use(requireTenant, requireAuth, enterTenantContext, requireRole('ADMIN'));

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await inviteService.createInvite({
      tenant: req.tenant,
      currentUser: req.user,
      ...data,
    });
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const invites = await inviteService.listInvites({ orgId: req.user.orgId });
    res.json({ invites });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await inviteService.revokeInvite({ orgId: req.user.orgId, id: req.params.id });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
