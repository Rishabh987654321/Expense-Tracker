-- One-time superuser setup. Run this against your Postgres instance BEFORE
-- running `prisma migrate dev`. Replace the passwords below with values that
-- match DATABASE_URL and MIGRATE_DATABASE_URL in your .env.
--
-- psql -U postgres -d expense_tracker -f prisma/sql/roles.sql
--
-- We create two roles:
--   * app_owner: BYPASSRLS = true. Owns the schema, used by `prisma migrate`.
--   * app_user : BYPASSRLS = false. Used by the running API. RLS policies
--                will filter every query made by this role.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_owner') THEN
    CREATE ROLE app_owner LOGIN PASSWORD 'app_owner_pw' BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_pw';
  END IF;
END $$;

GRANT CONNECT ON DATABASE expense_tracker TO app_owner, app_user;

GRANT USAGE ON SCHEMA public TO app_owner, app_user;
ALTER SCHEMA public OWNER TO app_owner;

-- After `prisma migrate dev` creates tables, the apply-rls script will:
--   * grant CRUD on tables/sequences to app_user
--   * enable RLS on tenant tables
--   * create the tenant_isolation policies
