import { Router } from 'express';
import { stringify } from 'csv-stringify';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import { prisma } from '../config/prisma.js';
import { buildExpenseFilters } from '../services/expense.service.js';

const router = Router();
router.use(
  requireTenant,
  requireAuth,
  enterTenantContext,
  requireRole('ADMIN', 'MANAGER')
);

router.get('/expenses.csv', async (req, res, next) => {
  try {
    const where = buildExpenseFilters(req.query, req.user);
    // Always scope exports to the current organization.
    where.orgId = req.user.orgId;
    const items = await prisma.expense.findMany({
      where,
      include: { submitter: { select: { name: true, email: true } } },
      orderBy: { expenseDate: 'desc' },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${Date.now()}.csv"`);

    const stringifier = stringify({
      header: true,
      columns: [
        { key: 'expenseDate',     header: 'Date' },
        { key: 'submitterName',   header: 'Submitter' },
        { key: 'submitterEmail',  header: 'Email' },
        { key: 'category',        header: 'Category' },
        { key: 'description',     header: 'Description' },
        { key: 'amount',          header: 'Amount' },
        { key: 'currency',        header: 'Currency' },
        { key: 'status',          header: 'Status' },
      ],
    });

    stringifier.pipe(res);

    for (const e of items) {
      stringifier.write({
        expenseDate: e.expenseDate.toISOString().slice(0, 10),
        submitterName: e.submitter.name,
        submitterEmail: e.submitter.email,
        category: e.category,
        description: e.description,
        amount: (e.amountCents / 100).toFixed(2),
        currency: e.currency,
        status: e.status,
      });
    }
    stringifier.end();
  } catch (err) { next(err); }
});

export default router;
