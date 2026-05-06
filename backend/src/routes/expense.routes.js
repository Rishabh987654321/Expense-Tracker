import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import { uploadReceipt } from '../middleware/upload.js';
import * as expenseService from '../services/expense.service.js';
import { withTenant } from '../config/prisma.js';

const router = Router();
router.use(requireTenant, requireAuth, enterTenantContext);

const createSchema = z.object({
  amountCents: z.coerce.number().int().positive().max(100_000_000),
  currency: z.string().length(3).default('USD'),
  category: z.enum(['TRAVEL', 'MEALS', 'SOFTWARE', 'OFFICE', 'OTHER']),
  description: z.string().min(1).max(500),
  expenseDate: z.string().min(8),
});

router.post('/', uploadReceipt, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await withTenant(
      { orgId: req.user.orgId, userId: req.user.userId, role: req.user.role },
      async () =>
        expenseService.createExpense({
          tenant: req.tenant,
          currentUser: req.user,
          data,
          file: req.file || null,
        })
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const result = await withTenant(
      { orgId: req.user.orgId, userId: req.user.userId, role: req.user.role },
      async () =>
        expenseService.listExpenses({
          currentUser: req.user,
          query: req.query,
        })
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await withTenant(
      { orgId: req.user.orgId, userId: req.user.userId, role: req.user.role },
      async () =>
        expenseService.getExpense({
          id: req.params.id,
          currentUser: req.user,
        })
    );
    res.json(result);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await withTenant(
      { orgId: req.user.orgId, userId: req.user.userId, role: req.user.role },
      async () =>
        expenseService.deleteExpense({
          id: req.params.id,
          currentUser: req.user,
        })
    );
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
