import { Router } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePublicHost, requireTenant } from '../middleware/tenantContext.js';

const router = Router();

const signupSchema = z.object({
  orgName: z.string().min(2).max(100),
  slug: z.string().min(2).max(32),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

router.post('/signup-org', requirePublicHost, async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    const result = await authService.signupOrg(data);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', requireTenant, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login({ tenant: req.tenant, ...data });
    res.json(result);
  } catch (err) { next(err); }
});

const acceptSchema = z.object({
  token: z.string().min(10),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(200),
});

router.post('/accept-invite', requirePublicHost, async (req, res, next) => {
  try {
    const data = acceptSchema.parse(req.body);
    const result = await authService.acceptInvite(data);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await authService.getMe(req.user);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
