import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  PUBLIC_APP_URL: z.string().url(),
  TENANT_APP_URL: z.string().min(1),
  RESERVED_SUBDOMAINS: z.string().default('app,www,api'),

  CORS_ORIGIN_REGEX: z.string().default('^http:\\/\\/([a-z0-9-]+\\.)?localhost:5173$'),

  DATABASE_URL: z.string().min(1),
  MIGRATE_DATABASE_URL: z.string().min(1).optional(),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(10),
  INVITE_TTL_HOURS: z.coerce.number().default(72),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  AZURE_STORAGE_CONNECTION_STRING: z.string().optional(),
  AZURE_BLOB_CONTAINER: z.string().default('receipts'),
  AZURE_SAS_TTL_MINUTES: z.coerce.number().default(15),

  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_FROM_NAME: z.string().default('Expense Tracker'),
  EMAIL_DRY_RUN: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const env = parsed.data;

export default {
  ...env,
  reservedSubdomains: env.RESERVED_SUBDOMAINS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  corsOriginRegex: new RegExp(env.CORS_ORIGIN_REGEX),
  isProd: env.NODE_ENV === 'production',
  isDev: env.NODE_ENV === 'development',
};
