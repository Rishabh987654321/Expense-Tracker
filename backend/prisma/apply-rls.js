import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.MIGRATE_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('MIGRATE_DATABASE_URL (or DATABASE_URL) must be set.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', 'rls.sql'), 'utf8');
  await prisma.$executeRawUnsafe(sql);
  console.log('[rls] policies applied.');
}

main()
  .catch((err) => {
    console.error('[rls] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
