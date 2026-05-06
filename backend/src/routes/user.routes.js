import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import * as userService from '../services/user.service.js';

const router = Router();
router.use(requireTenant, requireAuth, enterTenantContext);

router.get('/', async (req, res, next) => {
  try {
    const users = await userService.listUsers({ orgId: req.user.orgId });
    res.json({ users });
  } catch (err) { next(err); }
});

const roleSchema = z.object({ role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']) });

router.patch('/:id/role', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role } = roleSchema.parse(req.body);
    const user = await userService.updateUserRole({
      orgId: req.user.orgId,
      id: req.params.id,
      role,
      currentUserId: req.user.userId,
    });
    res.json({ user });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    await userService.deleteUser({
      orgId: req.user.orgId,
      id: req.params.id,
      currentUserId: req.user.userId,
    });
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
