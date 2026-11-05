-- Add WITH CHECK to RLS policies to allow INSERT/UPDATE when userId matches app.current_user_id
DO $$
BEGIN
  -- Drop and recreate categories policy with WITH CHECK
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='categories_user_scoped') THEN
    DROP POLICY "categories_user_scoped" ON "categories";
  END IF;
  CREATE POLICY "categories_user_scoped" ON "categories"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
      OR "isDefault" = true
    )
    WITH CHECK (
      "userId" = current_setting('app.current_user_id', true)::text
    );

  -- Drop and recreate transactions policy with WITH CHECK
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='transactions' AND policyname='transactions_user_scoped') THEN
    DROP POLICY "transactions_user_scoped" ON "transactions";
  END IF;
  CREATE POLICY "transactions_user_scoped" ON "transactions"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
    )
    WITH CHECK (
      "userId" = current_setting('app.current_user_id', true)::text
    );

  -- Drop and recreate budgets policy with WITH CHECK
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='budgets' AND policyname='budgets_user_scoped') THEN
    DROP POLICY "budgets_user_scoped" ON "budgets";
  END IF;
  CREATE POLICY "budgets_user_scoped" ON "budgets"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
    )
    WITH CHECK (
      "userId" = current_setting('app.current_user_id', true)::text
    );

  -- Drop and recreate refresh_tokens policy with WITH CHECK
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='refresh_tokens' AND policyname='refresh_tokens_user_scoped') THEN
    DROP POLICY "refresh_tokens_user_scoped" ON "refresh_tokens";
  END IF;
  CREATE POLICY "refresh_tokens_user_scoped" ON "refresh_tokens"
    FOR ALL
    TO PUBLIC
    USING (
      "userId" = current_setting('app.current_user_id', true)::text
    )
    WITH CHECK (
      "userId" = current_setting('app.current_user_id', true)::text
    );
END $$;
