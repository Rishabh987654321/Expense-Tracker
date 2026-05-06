-- Row-Level Security policies for tenant isolation.
-- Idempotent: safe to re-run after every migrate.
--
-- Apply via `npm run db:apply-rls` (uses MIGRATE_DATABASE_URL = app_owner).

-- Grant CRUD privileges to the runtime app_user role.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- The `Organization` table itself is special: rows must be visible to their
-- own org but NOT to other orgs. The signup-org endpoint runs as app_owner
-- (BYPASSRLS) so it can insert the very first row.
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "Organization";
CREATE POLICY tenant_isolation ON "Organization"
  USING ("id" = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK ("id" = current_setting('app.current_org_id', true)::uuid);

-- Helper: apply tenant_isolation on (orgId) for a given table.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY['User', 'Invite', 'Expense', 'Approval'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING ("orgId" = current_setting('app.current_org_id', true)::uuid)
        WITH CHECK ("orgId" = current_setting('app.current_org_id', true)::uuid)
    $f$, t);
  END LOOP;
END $$;
