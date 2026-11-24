-- Update RLS policies to allow operations when app.current_user_id is NULL
-- (no auth context). This enables application-layer ownership checks and
-- test cleanup without RLS context, while keeping production requests
-- (which always set app.current_user_id via authenticateToken) fully scoped.

DO $$
BEGIN
  -- categories
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'categories_user_scoped'
  ) THEN
    DROP POLICY "categories_user_scoped" ON "categories";
  END IF;
  CREATE POLICY "categories_user_scoped" ON "categories"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
      OR "isDefault" = true
      OR current_setting('app.current_user_id', true) IS NULL
    );

  -- transactions
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_user_scoped'
  ) THEN
    DROP POLICY "transactions_user_scoped" ON "transactions";
  END IF;
  CREATE POLICY "transactions_user_scoped" ON "transactions"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
      OR current_setting('app.current_user_id', true) IS NULL
    );

  -- budgets
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'budgets' AND policyname = 'budgets_user_scoped'
  ) THEN
    DROP POLICY "budgets_user_scoped" ON "budgets";
  END IF;
  CREATE POLICY "budgets_user_scoped" ON "budgets"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
      OR current_setting('app.current_user_id', true) IS NULL
    );

  -- refresh_tokens
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'refresh_tokens' AND policyname = 'refresh_tokens_user_scoped'
  ) THEN
    DROP POLICY "refresh_tokens_user_scoped" ON "refresh_tokens";
  END IF;
  CREATE POLICY "refresh_tokens_user_scoped" ON "refresh_tokens"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
      OR current_setting('app.current_user_id', true) IS NULL
    );
END $$;
