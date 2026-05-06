import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.ts';
import { AsyncLocalStorage } from 'node:async_hooks';
import env from './env.js';

function createPgAdapter(connectionString) {
  return new PrismaPg({ connectionString });
}

export const tenantContext = new AsyncLocalStorage();

// Base Prisma client. We do NOT wrap every query in a transaction.
// Tenant isolation is enforced by explicit `orgId` scoping in service queries.
export const prisma = new PrismaClient({
  adapter: createPgAdapter(env.DATABASE_URL),
  log: env.isDev ? ['warn', 'error'] : ['error'],
});

// Unscoped client used by signup-org (creates the very first Organization row
// and its admin User) and by the apply-rls/seed scripts. Connects as
// `MIGRATE_DATABASE_URL` (app_owner = BYPASSRLS) so it can insert across
// orgs without setting the GUC.
const adminDatabaseUrl = env.MIGRATE_DATABASE_URL || env.DATABASE_URL;

export const adminPrisma = new PrismaClient({
  adapter: createPgAdapter(adminDatabaseUrl),
  log: env.isDev ? ['warn', 'error'] : ['error'],
});

export async function withTenant({ orgId, userId, role }, fn) {
  return tenantContext.run({ orgId, userId, role }, async () => await fn());
}

// Note: `runInTenantTx` intentionally removed to avoid hidden transactions.
