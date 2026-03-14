-- =============================================================
-- RLS POLICIES — TEKO CASH
-- Run this in Supabase SQL Editor
-- Idempotent: uses DROP IF EXISTS before each CREATE
-- =============================================================

-- 1. users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
CREATE POLICY "Users can view their own record" ON public.users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
CREATE POLICY "Users can insert their own record" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
CREATE POLICY "Users can update their own record" ON public.users FOR UPDATE USING (id = auth.uid());

-- 2. incomes
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Incomes: select own" ON public.incomes;
CREATE POLICY "Incomes: select own" ON public.incomes FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Incomes: insert own" ON public.incomes;
CREATE POLICY "Incomes: insert own" ON public.incomes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Incomes: update own" ON public.incomes;
CREATE POLICY "Incomes: update own" ON public.incomes FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Incomes: delete own" ON public.incomes;
CREATE POLICY "Incomes: delete own" ON public.incomes FOR DELETE USING (user_id = auth.uid());

-- 3. categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories: select accessible" ON public.categories;
CREATE POLICY "Categories: select accessible" ON public.categories FOR SELECT USING (
  user_id IS NULL OR
  user_id = auth.uid() OR
  (family_group_id IS NOT NULL AND family_group_id IN (
    SELECT current_family_group_id FROM public.users WHERE id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Categories: insert own" ON public.categories;
CREATE POLICY "Categories: insert own" ON public.categories FOR INSERT WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid()) AND
  (family_group_id IS NULL OR family_group_id IN (
    SELECT current_family_group_id FROM public.users WHERE id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Categories: update own" ON public.categories;
CREATE POLICY "Categories: update own" ON public.categories FOR UPDATE USING (
  user_id = auth.uid() OR
  (family_group_id IS NOT NULL AND family_group_id IN (
    SELECT current_family_group_id FROM public.users WHERE id = auth.uid()
  ))
);
DROP POLICY IF EXISTS "Categories: delete own" ON public.categories;
CREATE POLICY "Categories: delete own" ON public.categories FOR DELETE USING (
  user_id = auth.uid() OR
  (family_group_id IS NOT NULL AND family_group_id IN (
    SELECT current_family_group_id FROM public.users WHERE id = auth.uid()
  ))
);

-- 4. user_category_preferences
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User category preferences: full access" ON public.user_category_preferences;
CREATE POLICY "User category preferences: full access" ON public.user_category_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- SECURITY DEFINER helpers to break RLS circular references between
-- family_groups <-> family_group_participants
-- These functions run with the privileges of the definer (bypassing RLS)
-- so they can safely query each table without triggering infinite recursion.

DROP FUNCTION IF EXISTS public.is_family_group_owner(uuid);
CREATE OR REPLACE FUNCTION public.is_family_group_owner(gid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_groups WHERE id = gid AND owner_id = auth.uid()
  );
$$;

DROP FUNCTION IF EXISTS public.is_active_family_member(gid uuid);
CREATE OR REPLACE FUNCTION public.is_active_family_member(gid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_group_participants
    WHERE group_id = gid AND user_id = auth.uid() AND status = 'active'
  );
$$;

-- 5. family_groups
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Family groups: select if owner or member" ON public.family_groups;
CREATE POLICY "Family groups: select if owner or member" ON public.family_groups FOR SELECT USING (
  owner_id = auth.uid() OR public.is_active_family_member(id)
);
DROP POLICY IF EXISTS "Family groups: insert if owner" ON public.family_groups;
CREATE POLICY "Family groups: insert if owner" ON public.family_groups FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Family groups: update if owner" ON public.family_groups;
CREATE POLICY "Family groups: update if owner" ON public.family_groups FOR UPDATE USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Family groups: delete if owner" ON public.family_groups;
CREATE POLICY "Family groups: delete if owner" ON public.family_groups FOR DELETE USING (owner_id = auth.uid());

-- 6. family_group_participants
ALTER TABLE public.family_group_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "FGP: select if participant or group owner" ON public.family_group_participants;
CREATE POLICY "FGP: select if participant or group owner" ON public.family_group_participants FOR SELECT USING (
  user_id = auth.uid() OR public.is_family_group_owner(group_id)
);
DROP POLICY IF EXISTS "FGP: insert if self" ON public.family_group_participants;
CREATE POLICY "FGP: insert if self" ON public.family_group_participants FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "FGP: update if self or group owner" ON public.family_group_participants;
CREATE POLICY "FGP: update if self or group owner" ON public.family_group_participants FOR UPDATE USING (
  user_id = auth.uid() OR public.is_family_group_owner(group_id)
);
DROP POLICY IF EXISTS "FGP: delete if self or group owner" ON public.family_group_participants;
CREATE POLICY "FGP: delete if self or group owner" ON public.family_group_participants FOR DELETE USING (
  user_id = auth.uid() OR public.is_family_group_owner(group_id)
);

-- 7. balances
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Balances: select if member or own" ON public.balances;
CREATE POLICY "Balances: select if member or own" ON public.balances FOR SELECT USING (
  user_id = auth.uid() OR
  group_id IN (
    SELECT group_id FROM public.family_group_participants
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
DROP POLICY IF EXISTS "Balances: insert if own" ON public.balances;
CREATE POLICY "Balances: insert if own" ON public.balances FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  group_id IN (
    SELECT group_id FROM public.family_group_participants
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
DROP POLICY IF EXISTS "Balances: update if own" ON public.balances;
CREATE POLICY "Balances: update if own" ON public.balances FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Balances: delete if own" ON public.balances;
CREATE POLICY "Balances: delete if own" ON public.balances FOR DELETE USING (user_id = auth.uid());

-- 8. user_payment_methods
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User payment methods: full access" ON public.user_payment_methods;
CREATE POLICY "User payment methods: full access" ON public.user_payment_methods
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 9. transaction_types
ALTER TABLE public.transaction_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transaction types: select accessible" ON public.transaction_types;
CREATE POLICY "Transaction types: select accessible" ON public.transaction_types FOR SELECT USING (
  user_id IS NULL OR user_id = auth.uid()
);
DROP POLICY IF EXISTS "Transaction types: insert if own" ON public.transaction_types;
CREATE POLICY "Transaction types: insert if own" ON public.transaction_types FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Transaction types: update if own" ON public.transaction_types;
CREATE POLICY "Transaction types: update if own" ON public.transaction_types FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Transaction types: delete if own" ON public.transaction_types;
CREATE POLICY "Transaction types: delete if own" ON public.transaction_types FOR DELETE USING (user_id = auth.uid());

-- 10. budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Budgets: select if own or group member" ON public.budgets;
CREATE POLICY "Budgets: select if own or group member" ON public.budgets FOR SELECT USING (
  user_id = auth.uid() OR family_group_id IN (
    SELECT group_id FROM public.family_group_participants
    WHERE user_id = auth.uid() AND status = 'active'
  )
);
DROP POLICY IF EXISTS "Budgets: insert if own" ON public.budgets;
CREATE POLICY "Budgets: insert if own" ON public.budgets FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Budgets: update if own" ON public.budgets;
CREATE POLICY "Budgets: update if own" ON public.budgets FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Budgets: delete if own" ON public.budgets;
CREATE POLICY "Budgets: delete if own" ON public.budgets FOR DELETE USING (user_id = auth.uid());

-- 11. transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transactions: select if own or group member" ON public.transactions;
CREATE POLICY "Transactions: select if own or group member" ON public.transactions FOR SELECT USING (
  user_id = auth.uid() OR
  (family_group_id IS NOT NULL AND family_group_id IN (
    SELECT group_id FROM public.family_group_participants
    WHERE user_id = auth.uid() AND status = 'active'
  ))
);
DROP POLICY IF EXISTS "Transactions: insert if own" ON public.transactions;
CREATE POLICY "Transactions: insert if own" ON public.transactions FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Transactions: update if own" ON public.transactions;
CREATE POLICY "Transactions: update if own" ON public.transactions FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Transactions: delete if own" ON public.transactions;
CREATE POLICY "Transactions: delete if own" ON public.transactions FOR DELETE USING (user_id = auth.uid());

-- 12. transaction_participants
ALTER TABLE public.transaction_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transaction participants: full access" ON public.transaction_participants;
CREATE POLICY "Transaction participants: full access" ON public.transaction_participants
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_participants.transaction_id AND t.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = transaction_participants.transaction_id AND t.user_id = auth.uid()
  ));

-- 13. currencies (read-only for all authenticated users)
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Currencies: read for all authenticated" ON public.currencies;
CREATE POLICY "Currencies: read for all authenticated" ON public.currencies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================================
-- SCHEMA ADDITIONS (run after RLS policies)
-- =============================================================

-- categories: per-user soft-delete (global categories can be hidden per user via user_category_preferences.is_enabled)
-- The categories table itself doesn't need is_active — is_enabled in user_category_preferences covers the use case.
-- If you want a global is_active for admin control, add:
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- budgets: repeat_frequency for auto-renewing budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS repeat_frequency TEXT
    CHECK (repeat_frequency IN ('none','mensual','semanal','anual'))
    NOT NULL DEFAULT 'none';

-- user_payment_methods: add missing columns used by the TypeScript types
ALTER TABLE public.user_payment_methods
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS icon      TEXT,
  ADD COLUMN IF NOT EXISTS color     TEXT,
  ADD COLUMN IF NOT EXISTS currency_id UUID REFERENCES public.currencies(id) ON DELETE SET NULL;

-- transactions: add receipt_url for Supabase Storage receipts
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Supabase Storage bucket for receipts
-- Run this in Supabase Dashboard → Storage → New Bucket (or via SQL):
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own receipts
-- Path convention: receipts/{user_id}/{transaction_id}.{ext}
DROP POLICY IF EXISTS "Receipts: owner access" ON storage.objects;
CREATE POLICY "Receipts: owner access" ON storage.objects
  FOR ALL USING (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'receipts' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
