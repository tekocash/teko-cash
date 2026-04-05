-- =============================================================
-- TEKO CASH — ONE-CLICK DATABASE INSTALLER
-- =============================================================
-- Run this single file in the Supabase SQL Editor to set up the
-- entire Teko Cash database from scratch.
--
-- This file is fully IDEMPOTENT: it is safe to run multiple times.
-- All statements use IF NOT EXISTS, DROP IF EXISTS, ON CONFLICT DO
-- NOTHING, or CREATE OR REPLACE where applicable.
--
-- Sections (in order):
--   1. Extensions
--   2. Core tables (schema.sql)
--   3. RLS policies & security helpers (rls_policies.sql)
--   4. Schema additions (columns, storage)
--   5. Credit cards (20260326_credit_cards.sql)
--   6. Push subscriptions & notification log (20260405_push_subscriptions.sql)
--   7. Credit card ↔ payment method link
--   8. Default seed data (currencies, transaction types, categories)
-- =============================================================


-- =============================================================
-- SECTION 1 — EXTENSIONS
-- =============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================
-- SECTION 2 — CORE TABLES
-- =============================================================

-- 2.1 Currencies (no dependencies)
CREATE TABLE IF NOT EXISTS public.currencies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  symbol     TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2.2 Users (FK to family_groups added later to break circular ref)
CREATE TABLE IF NOT EXISTS public.users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    TEXT NOT NULL DEFAULT 'standard'
                            CHECK (type IN ('admin','beta','standard','premium')),
  level                   NUMERIC DEFAULT 1,
  email                   TEXT UNIQUE NOT NULL,
  user_name               TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  current_family_group_id UUID,           -- FK added below after family_groups exists
  created_at              TIMESTAMP DEFAULT now()
);

-- 2.3 Family groups (depends on users)
CREATE TABLE IF NOT EXISTS public.family_groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  owner_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code  TEXT UNIQUE,
  type_calculo TEXT NOT NULL CHECK (type_calculo IN ('fixed','ratio')),
  created_at   TIMESTAMP DEFAULT now()
);

-- Add the circular FK now that family_groups exists (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_current_family_group'
      AND table_name = 'users'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT fk_users_current_family_group
      FOREIGN KEY (current_family_group_id)
      REFERENCES public.family_groups(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

-- 2.4 Transaction types
CREATE TABLE IF NOT EXISTS public.transaction_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,  -- NULL = global
  name       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, name)
);

-- 2.5 Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.users(id) ON DELETE CASCADE,
  family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category_type   TEXT NOT NULL DEFAULT 'expense'
                    CHECK (category_type IN ('expense','income')),
  parent_id       UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT now()
);

-- 2.6 User category preferences
CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  color       TEXT,
  icon        TEXT,
  is_favorite BOOLEAN,
  updated_at  TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- 2.7 Family group participants
CREATE TABLE IF NOT EXISTS public.family_group_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL CHECK (status IN ('pending','active','left','rejected')),
  joined_at         TIMESTAMP,
  left_at           TIMESTAMP,
  rejected_at       TIMESTAMP,
  percentage        NUMERIC,
  income_types_used TEXT[],
  UNIQUE (group_id, user_id)
);

-- 2.8 Balances
CREATE TABLE IF NOT EXISTS public.balances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  net_balance  NUMERIC DEFAULT 0,
  last_updated TIMESTAMP DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- 2.9 Payment methods
CREATE TABLE IF NOT EXISTS public.user_payment_methods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  bank       TEXT,
  details    TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- 2.10 Planned incomes
CREATE TABLE IF NOT EXISTS public.incomes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('fijo','variable')),
  amount      NUMERIC NOT NULL,
  month       TEXT,
  description TEXT,
  currency_id UUID REFERENCES public.currencies(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP
);

-- 2.11 Budgets
CREATE TABLE IF NOT EXISTS public.budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  budget_type     TEXT CHECK (budget_type IN ('fijo','variable','mixto')),
  periodicity     TEXT CHECK (periodicity IN ('mensual','ocasional','puntual','anual','otro')),
  name            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  month           TEXT NOT NULL,
  planned_amount  NUMERIC NOT NULL,
  start_date      TIMESTAMP NOT NULL,
  end_date        TIMESTAMP NOT NULL,
  currency_id     UUID REFERENCES public.currencies(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP
);

-- 2.12 Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  family_group_id     UUID REFERENCES public.family_groups(id) ON DELETE SET NULL,
  budget_id           UUID REFERENCES public.budgets(id) ON DELETE SET NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('income','expense')),
  amount              NUMERIC NOT NULL,
  date                TIMESTAMP NOT NULL,
  category_id         UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  concepto            TEXT,
  comercio            TEXT,
  additional_info     TEXT,
  nro_operacion       TEXT,
  payment_method_id   UUID REFERENCES public.user_payment_methods(id) ON DELETE SET NULL,
  transaction_type_id UUID REFERENCES public.transaction_types(id) ON DELETE SET NULL,
  periodicity         TEXT CHECK (periodicity IN ('mensual','trimestral','anual','ocasional')),
  use_group_ratio     BOOLEAN NOT NULL DEFAULT FALSE,
  currency_id         UUID REFERENCES public.currencies(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT now()
);

-- 2.13 Transaction participants (expense splitting)
CREATE TABLE IF NOT EXISTS public.transaction_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_amount NUMERIC NOT NULL,
  UNIQUE (transaction_id, user_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON public.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_direction  ON public.transactions(direction);
CREATE INDEX IF NOT EXISTS idx_transactions_group      ON public.transactions(family_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_user         ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_group        ON public.categories(family_group_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month      ON public.budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_fgp_group_user          ON public.family_group_participants(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_balances_group          ON public.balances(group_id);

-- Trigger: auto-create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, user_name, display_name, type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    'standard'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================
-- SECTION 3 — ROW LEVEL SECURITY (RLS)
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE public.users                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payment_methods      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_participants  ENABLE ROW LEVEL SECURITY;

-- Security-definer helpers (break circular RLS between family_groups ↔ participants)
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

-- users
DROP POLICY IF EXISTS "Users can view their own record"   ON public.users;
CREATE POLICY "Users can view their own record"   ON public.users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
CREATE POLICY "Users can insert their own record" ON public.users FOR INSERT WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
CREATE POLICY "Users can update their own record" ON public.users FOR UPDATE USING (id = auth.uid());

-- currencies
DROP POLICY IF EXISTS "Currencies: read for all authenticated" ON public.currencies;
CREATE POLICY "Currencies: read for all authenticated" ON public.currencies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- transaction_types
DROP POLICY IF EXISTS "Transaction types: select accessible" ON public.transaction_types;
CREATE POLICY "Transaction types: select accessible" ON public.transaction_types FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "Transaction types: insert if own" ON public.transaction_types;
CREATE POLICY "Transaction types: insert if own" ON public.transaction_types FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Transaction types: update if own" ON public.transaction_types;
CREATE POLICY "Transaction types: update if own" ON public.transaction_types FOR UPDATE
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Transaction types: delete if own" ON public.transaction_types;
CREATE POLICY "Transaction types: delete if own" ON public.transaction_types FOR DELETE
  USING (user_id = auth.uid());

-- categories
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

-- user_category_preferences
DROP POLICY IF EXISTS "User category preferences: full access" ON public.user_category_preferences;
CREATE POLICY "User category preferences: full access" ON public.user_category_preferences
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- family_groups
DROP POLICY IF EXISTS "Family groups: select if owner or member" ON public.family_groups;
CREATE POLICY "Family groups: select if owner or member" ON public.family_groups FOR SELECT
  USING (owner_id = auth.uid() OR public.is_active_family_member(id));
DROP POLICY IF EXISTS "Family groups: insert if owner" ON public.family_groups;
CREATE POLICY "Family groups: insert if owner" ON public.family_groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Family groups: update if owner" ON public.family_groups;
CREATE POLICY "Family groups: update if owner" ON public.family_groups FOR UPDATE
  USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Family groups: delete if owner" ON public.family_groups;
CREATE POLICY "Family groups: delete if owner" ON public.family_groups FOR DELETE
  USING (owner_id = auth.uid());

-- family_group_participants
DROP POLICY IF EXISTS "FGP: select if participant or group owner" ON public.family_group_participants;
CREATE POLICY "FGP: select if participant or group owner" ON public.family_group_participants FOR SELECT
  USING (user_id = auth.uid() OR public.is_family_group_owner(group_id));
DROP POLICY IF EXISTS "FGP: insert if self" ON public.family_group_participants;
CREATE POLICY "FGP: insert if self" ON public.family_group_participants FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "FGP: update if self or group owner" ON public.family_group_participants;
CREATE POLICY "FGP: update if self or group owner" ON public.family_group_participants FOR UPDATE
  USING (user_id = auth.uid() OR public.is_family_group_owner(group_id));
DROP POLICY IF EXISTS "FGP: delete if self or group owner" ON public.family_group_participants;
CREATE POLICY "FGP: delete if self or group owner" ON public.family_group_participants FOR DELETE
  USING (user_id = auth.uid() OR public.is_family_group_owner(group_id));

-- balances
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

-- user_payment_methods
DROP POLICY IF EXISTS "User payment methods: full access" ON public.user_payment_methods;
CREATE POLICY "User payment methods: full access" ON public.user_payment_methods
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- incomes
DROP POLICY IF EXISTS "Incomes: select own" ON public.incomes;
CREATE POLICY "Incomes: select own" ON public.incomes FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Incomes: insert own" ON public.incomes;
CREATE POLICY "Incomes: insert own" ON public.incomes FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Incomes: update own" ON public.incomes;
CREATE POLICY "Incomes: update own" ON public.incomes FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Incomes: delete own" ON public.incomes;
CREATE POLICY "Incomes: delete own" ON public.incomes FOR DELETE USING (user_id = auth.uid());

-- budgets
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

-- transactions
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

-- transaction_participants
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


-- =============================================================
-- SECTION 4 — SCHEMA ADDITIONS (columns added after initial schema)
-- =============================================================

-- categories: per-user soft-delete flag
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- budgets: repeat frequency for auto-renewing budgets
ALTER TABLE public.budgets
  ADD COLUMN IF NOT EXISTS repeat_frequency TEXT
    CHECK (repeat_frequency IN ('none','mensual','semanal','anual'))
    NOT NULL DEFAULT 'none';

-- user_payment_methods: extra columns used by TypeScript types
ALTER TABLE public.user_payment_methods
  ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS icon         TEXT,
  ADD COLUMN IF NOT EXISTS color        TEXT,
  ADD COLUMN IF NOT EXISTS currency_id  UUID REFERENCES public.currencies(id) ON DELETE SET NULL;

-- transactions: receipt storage URL
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Supabase Storage bucket for receipts (path: receipts/{user_id}/{transaction_id}.ext)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own receipts
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


-- =============================================================
-- SECTION 5 — CREDIT CARDS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_credit_cards (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  bank                    TEXT NOT NULL DEFAULT 'Otro',
  last_four               TEXT,
  tan                     NUMERIC(6,2)  DEFAULT 0,
  tae                     NUMERIC(6,2)  DEFAULT 0,
  credit_limit            NUMERIC(20,2) DEFAULT 0,
  currency                TEXT          DEFAULT 'PYG',
  closing_day             SMALLINT      DEFAULT 1,
  due_day                 SMALLINT      DEFAULT 15,
  annual_fee              NUMERIC(20,2) DEFAULT 0,
  notes                   TEXT,
  -- Latest statement snapshot
  statement_date          DATE,
  due_date                DATE,
  credit_available        NUMERIC(20,2),
  previous_debt           NUMERIC(20,2) DEFAULT 0,
  payments                NUMERIC(20,2) DEFAULT 0,
  financed_balance        NUMERIC(20,2) DEFAULT 0,
  purchases_charges       NUMERIC(20,2) DEFAULT 0,
  total_debt              NUMERIC(20,2) DEFAULT 0,
  minimum_payment         NUMERIC(20,2) DEFAULT 0,
  interest                NUMERIC(20,2) DEFAULT 0,
  punitory                NUMERIC(20,2) DEFAULT 0,
  iva_on_charges          NUMERIC(20,2) DEFAULT 0,
  total_financial_charges NUMERIC(20,2) DEFAULT 0,
  days_in_default         SMALLINT      DEFAULT 0,
  card_holder             TEXT,
  card_number_masked      TEXT,
  created_at              TIMESTAMPTZ   DEFAULT now(),
  updated_at              TIMESTAMPTZ   DEFAULT now()
);

-- RLS for credit cards
ALTER TABLE public.user_credit_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cards" ON public.user_credit_cards;
CREATE POLICY "Users manage own cards" ON public.user_credit_cards
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS credit_cards_updated_at ON public.user_credit_cards;
CREATE TRIGGER credit_cards_updated_at
  BEFORE UPDATE ON public.user_credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- =============================================================
-- SECTION 6 — PUSH SUBSCRIPTIONS & NOTIFICATION LOG
-- =============================================================

-- Push subscriptions: stores Web Push API endpoints per user/device
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT      NOT NULL,
  p256dh     TEXT      NOT NULL,
  auth_key   TEXT      NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push subs: full access own" ON public.push_subscriptions;
CREATE POLICY "Push subs: full access own" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Service role can read all (needed by Edge Function to send pushes)
DROP POLICY IF EXISTS "Push subs: service role read all" ON public.push_subscriptions;
CREATE POLICY "Push subs: service role read all" ON public.push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- Notification log: persists in-app notification history
CREATE TABLE IF NOT EXISTS public.notification_log (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT      NOT NULL CHECK (type IN ('budget_warn','budget_over','weekly_report','monthly_report','reminder','system')),
  title      TEXT      NOT NULL,
  body       TEXT,
  data       JSONB,
  read       BOOLEAN   NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notif log: full access own" ON public.notification_log;
CREATE POLICY "Notif log: full access own" ON public.notification_log
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Notif log: service role insert" ON public.notification_log;
CREATE POLICY "Notif log: service role insert" ON public.notification_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Index: fast per-user unread count
CREATE INDEX IF NOT EXISTS idx_notification_log_user_unread
  ON public.notification_log(user_id, read, created_at DESC);


-- =============================================================
-- SECTION 7 — CREDIT CARD <-> PAYMENT METHOD LINK
-- =============================================================

-- Link credit cards to a payment method entry so transactions
-- recorded against a card are automatically associated.
ALTER TABLE public.user_credit_cards
  ADD COLUMN IF NOT EXISTS payment_method_id UUID
    REFERENCES public.user_payment_methods(id) ON DELETE SET NULL;


-- =============================================================
-- SECTION 8 — DEFAULT SEED DATA
-- =============================================================

-- Currencies (primary ones used in Paraguay + neighbours)
INSERT INTO public.currencies (code, name, symbol) VALUES
  ('PYG', 'Guaraní paraguayo',    '₲'),
  ('USD', 'Dólar estadounidense', '$'),
  ('BRL', 'Real brasileño',       'R$'),
  ('ARS', 'Peso argentino',       '$'),
  ('EUR', 'Euro',                 '€'),
  ('CLP', 'Peso chileno',         '$'),
  ('COP', 'Peso colombiano',      '$'),
  ('MXN', 'Peso mexicano',        '$')
ON CONFLICT (code) DO NOTHING;

-- Global transaction types (user_id NULL = available to everyone)
INSERT INTO public.transaction_types (id, user_id, name) VALUES
  (gen_random_uuid(), NULL, 'fijo'),
  (gen_random_uuid(), NULL, 'variable'),
  (gen_random_uuid(), NULL, 'ocasional'),
  (gen_random_uuid(), NULL, 'deuda'),
  (gen_random_uuid(), NULL, 'reintegro')
ON CONFLICT DO NOTHING;

-- Global expense categories
INSERT INTO public.categories (id, user_id, family_group_id, name, category_type) VALUES
  (gen_random_uuid(), NULL, NULL, 'Alimentación',    'expense'),
  (gen_random_uuid(), NULL, NULL, 'Transporte',      'expense'),
  (gen_random_uuid(), NULL, NULL, 'Vivienda',        'expense'),
  (gen_random_uuid(), NULL, NULL, 'Salud',           'expense'),
  (gen_random_uuid(), NULL, NULL, 'Educación',       'expense'),
  (gen_random_uuid(), NULL, NULL, 'Entretenimiento', 'expense'),
  (gen_random_uuid(), NULL, NULL, 'Ropa y calzado',  'expense'),
  (gen_random_uuid(), NULL, NULL, 'Tecnología',      'expense'),
  (gen_random_uuid(), NULL, NULL, 'Servicios',       'expense'),
  (gen_random_uuid(), NULL, NULL, 'Mascotas',        'expense'),
  (gen_random_uuid(), NULL, NULL, 'Viajes',          'expense'),
  (gen_random_uuid(), NULL, NULL, 'Otros gastos',    'expense')
ON CONFLICT DO NOTHING;

-- Global income categories
INSERT INTO public.categories (id, user_id, family_group_id, name, category_type) VALUES
  (gen_random_uuid(), NULL, NULL, 'Salario',        'income'),
  (gen_random_uuid(), NULL, NULL, 'Freelance',      'income'),
  (gen_random_uuid(), NULL, NULL, 'Inversiones',    'income'),
  (gen_random_uuid(), NULL, NULL, 'Alquiler',       'income'),
  (gen_random_uuid(), NULL, NULL, 'Ventas',         'income'),
  (gen_random_uuid(), NULL, NULL, 'Otros ingresos', 'income')
ON CONFLICT DO NOTHING;

-- =============================================================
-- END OF INSTALL.sql
-- All done! Your Teko Cash database is ready.
-- =============================================================
