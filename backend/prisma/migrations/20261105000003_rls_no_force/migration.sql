-- Remove FORCE ROW LEVEL SECURITY so the Prisma connection (table owner)
-- is not subject to RLS policies for INSERT/UPDATE/DELETE, while policies
-- with USING still filter SELECT for non-owner connections.
-- RLS remains ENABLED with USING + WITH CHECK policies for data isolation.

ALTER TABLE "categories" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "transactions" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "budgets" NO FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" NO FORCE ROW LEVEL SECURITY;
