import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireTenant, enterTenantContext } from '../middleware/tenantContext.js';
import * as analyticsService from '../services/analytics.service.js';

const router = Router();
router.use(
  requireTenant,
  requireAuth,
  enterTenantContext,
  // Employees can access analytics, but only for themselves.
  requireRole('ADMIN', 'MANAGER', 'EMPLOYEE')
);

function effectiveSubmitterId(req) {
  const q = (req.query?.submitterId || '').toString().trim();
  if (req.user.role === 'EMPLOYEE') return req.user.userId;
  return q || null;
}

router.get('/summary', async (req, res, next) => {
  try {
    res.json(
      await analyticsService.summary({
        query: req.query,
        orgId: req.user.orgId,
        submitterId: effectiveSubmitterId(req),
      })
    );
  }
  catch (err) { next(err); }
});

router.get('/by-category', async (req, res, next) => {
  try {
    res.json(
      await analyticsService.byCategory({
        query: req.query,
        orgId: req.user.orgId,
        submitterId: effectiveSubmitterId(req),
      })
    );
  }
  catch (err) { next(err); }
});

router.get('/by-user', async (req, res, next) => {
  try {
    res.json(
      await analyticsService.byUser({
        query: req.query,
        orgId: req.user.orgId,
        submitterId: effectiveSubmitterId(req),
      })
    );
  }
  catch (err) { next(err); }
});

router.get('/by-month', async (req, res, next) => {
  try {
    res.json(
      await analyticsService.byMonth({
        query: req.query,
        orgId: req.user.orgId,
        submitterId: effectiveSubmitterId(req),
      })
    );
  }
  catch (err) { next(err); }
});

export default router;
