import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { resolveTenantFromHost } from './middleware/tenantContext.js';
import authRoutes from './routes/auth.routes.js';
import inviteRoutes from './routes/invite.routes.js';
import userRoutes from './routes/user.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import receiptRoutes from './routes/receipt.routes.js';
import approvalRoutes from './routes/approval.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import exportRoutes from './routes/export.routes.js';
import adminRequestRoutes from './routes/adminRequest.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import meRoutes from './routes/me.routes.js';
import avatarRoutes from './routes/avatar.routes.js';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.corsOriginRegex.test(origin)) return cb(null, true);
      return cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isDev ? 'dev' : 'combined'));

app.use(resolveTenantFromHost);

app.get('/health', (req, res) => {
  res.json({ ok: true, env: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/admin-requests', adminRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/me', meRoutes);
app.use('/api/avatars', avatarRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
