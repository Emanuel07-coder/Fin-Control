-- Enable Row Level Security on user-scoped tables
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;

-- Force RLS so even the table owner (the app DB user) is subject to policies
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;
ALTER TABLE "budgets" FORCE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" FORCE ROW LEVEL SECURITY;

-- Helper: read the user id injected by the Prisma extension via
-- SET app.current_user_id = '<userId>' before each operation.
-- When app.current_user_id is NULL (no auth context), all rows are visible.
-- This allows cleanup and explicit ownership checks in the application layer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'categories_user_scoped'
  ) THEN
    CREATE POLICY "categories_user_scoped" ON "categories"
      FOR ALL
      TO PUBLIC
      USING (
        "userId" = current_setting('app.current_user_id', true)::text
        OR "isDefault" = true
        OR current_setting('app.current_user_id', true) IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_user_scoped'
  ) THEN
    CREATE POLICY "transactions_user_scoped" ON "transactions"
      FOR ALL
      TO PUBLIC
      USING (
        "userId" = current_setting('app.current_user_id', true)::text
        OR current_setting('app.current_user_id', true) IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budgets' AND policyname = 'budgets_user_scoped'
  ) THEN
    CREATE POLICY "budgets_user_scoped" ON "budgets"
      FOR ALL
      TO PUBLIC
      USING (
        "userId" = current_setting('app.current_user_id', true)::text
        OR current_setting('app.current_user_id', true) IS NULL
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'refresh_tokens' AND policyname = 'refresh_tokens_user_scoped'
  ) THEN
    CREATE POLICY "refresh_tokens_user_scoped" ON "refresh_tokens"
      FOR ALL
      TO PUBLIC
      USING (
        "userId" = current_setting('app.current_user_id', true)::text
        OR current_setting('app.current_user_id', true) IS NULL
      );
  END IF;
END $$;
