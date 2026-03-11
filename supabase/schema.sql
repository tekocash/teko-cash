-- ============================================================
-- TEKO CASH - Script de instalación completo
-- Ejecutar en el SQL Editor de Supabase (en orden)
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. MONEDAS (sin dependencias)
-- ============================================================
CREATE TABLE IF NOT EXISTS currencies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  symbol     TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 2. USUARIOS (sin FK a family_groups por ahora — se agrega después)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    TEXT NOT NULL DEFAULT 'standard'
                            CHECK (type IN ('admin','beta','standard','premium')),
  level                   NUMERIC DEFAULT 1,
  email                   TEXT UNIQUE NOT NULL,
  user_name               TEXT NOT NULL,
  display_name            TEXT NOT NULL,
  current_family_group_id UUID,           -- FK se agrega con ALTER TABLE más abajo
  created_at              TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 3. GRUPOS FAMILIARES (depende de users)
-- ============================================================
CREATE TABLE IF NOT EXISTS family_groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code  TEXT UNIQUE,
  type_calculo TEXT NOT NULL CHECK (type_calculo IN ('fixed','ratio')),
  created_at   TIMESTAMP DEFAULT now()
);

-- Ahora sí se puede agregar la FK circular
ALTER TABLE users
  ADD CONSTRAINT fk_users_current_family_group
  FOREIGN KEY (current_family_group_id)
  REFERENCES family_groups(id)
  ON DELETE SET NULL;

-- ============================================================
-- 4. TIPOS DE TRANSACCIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = global
  name       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, name)
);

-- ============================================================
-- 5. CATEGORÍAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category_type   TEXT NOT NULL DEFAULT 'expense'
                    CHECK (category_type IN ('expense','income')),
  parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 6. PREFERENCIAS DE CATEGORÍA POR USUARIO
-- ============================================================
CREATE TABLE IF NOT EXISTS user_category_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  is_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  color       TEXT,
  icon        TEXT,
  is_favorite BOOLEAN,
  updated_at  TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, category_id)
);

-- ============================================================
-- 7. PARTICIPANTES DE GRUPOS FAMILIARES
-- ============================================================
CREATE TABLE IF NOT EXISTS family_group_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            TEXT NOT NULL CHECK (status IN ('pending','active','left','rejected')),
  joined_at         TIMESTAMP,
  left_at           TIMESTAMP,
  rejected_at       TIMESTAMP,
  percentage        NUMERIC,
  income_types_used TEXT[],
  UNIQUE (group_id, user_id)
);

-- ============================================================
-- 8. BALANCES
-- ============================================================
CREATE TABLE IF NOT EXISTS balances (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  net_balance  NUMERIC DEFAULT 0,
  last_updated TIMESTAMP DEFAULT now(),
  UNIQUE (group_id, user_id)
);

-- ============================================================
-- 9. MÉTODOS DE PAGO
-- ============================================================
CREATE TABLE IF NOT EXISTS user_payment_methods (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  bank       TEXT,
  details    TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 10. INGRESOS PLANIFICADOS
-- ============================================================
CREATE TABLE IF NOT EXISTS incomes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('fijo','variable')),
  amount      NUMERIC NOT NULL,
  month       TEXT,
  description TEXT,
  currency_id UUID REFERENCES currencies(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP
);

-- ============================================================
-- 11. PRESUPUESTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  category_id     UUID REFERENCES categories(id) ON DELETE CASCADE,
  budget_type     TEXT CHECK (budget_type IN ('fijo','variable','mixto')),
  periodicity     TEXT CHECK (periodicity IN ('mensual','ocasional','puntual','anual','otro')),
  name            TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  month           TEXT NOT NULL,
  planned_amount  NUMERIC NOT NULL,
  start_date      TIMESTAMP NOT NULL,
  end_date        TIMESTAMP NOT NULL,
  currency_id     UUID REFERENCES currencies(id) ON DELETE SET NULL,
  created_at      TIMESTAMP DEFAULT now(),
  updated_at      TIMESTAMP
);

-- ============================================================
-- 12. TRANSACCIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_group_id     UUID REFERENCES family_groups(id) ON DELETE SET NULL,
  budget_id           UUID REFERENCES budgets(id) ON DELETE SET NULL,
  direction           TEXT NOT NULL CHECK (direction IN ('income','expense')),
  amount              NUMERIC NOT NULL,
  date                TIMESTAMP NOT NULL,
  category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
  concepto            TEXT,
  comercio            TEXT,
  additional_info     TEXT,
  nro_operacion       TEXT,
  payment_method_id   UUID REFERENCES user_payment_methods(id) ON DELETE SET NULL,
  transaction_type_id UUID REFERENCES transaction_types(id) ON DELETE SET NULL,
  periodicity         TEXT CHECK (periodicity IN ('mensual','trimestral','anual','ocasional')),
  use_group_ratio     BOOLEAN NOT NULL DEFAULT FALSE,
  currency_id         UUID REFERENCES currencies(id) ON DELETE SET NULL,
  created_at          TIMESTAMP DEFAULT now()
);

-- ============================================================
-- 13. PARTICIPANTES EN TRANSACCIONES (división de gastos)
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id  UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_amount NUMERIC NOT NULL,
  UNIQUE (transaction_id, user_id)
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date       ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_direction  ON transactions(direction);
CREATE INDEX IF NOT EXISTS idx_transactions_group      ON transactions(family_group_id);
CREATE INDEX IF NOT EXISTS idx_categories_user         ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_group        ON categories(family_group_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_month      ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS idx_fgp_group_user          ON family_group_participants(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_balances_group          ON balances(group_id);

-- ============================================================
-- TRIGGER: Crear perfil de usuario automáticamente al registrarse
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
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
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies               ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods     ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_participants ENABLE ROW LEVEL SECURITY;

-- Función auxiliar: devuelve true si el usuario autenticado es miembro activo del grupo
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_group_participants
    WHERE group_id = p_group_id
      AND user_id  = auth.uid()
      AND status   = 'active'
  );
$$;

-- users: cada usuario sólo ve y edita su propio perfil
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- currencies: lectura pública para usuarios autenticados
CREATE POLICY "currencies_read" ON currencies FOR SELECT TO authenticated USING (true);

-- transaction_types: globales (user_id IS NULL) + propias
CREATE POLICY "transaction_types_read" ON transaction_types FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "transaction_types_insert" ON transaction_types FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "transaction_types_update" ON transaction_types FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "transaction_types_delete" ON transaction_types FOR DELETE
  USING (user_id = auth.uid());

-- categories: globales + personales + del grupo al que pertenece el usuario
CREATE POLICY "categories_read" ON categories FOR SELECT
  USING (
    user_id IS NULL AND family_group_id IS NULL          -- global
    OR user_id = auth.uid()                              -- personal
    OR (family_group_id IS NOT NULL AND is_group_member(family_group_id))
  );
CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid() OR (family_group_id IS NOT NULL AND is_group_member(family_group_id)));
CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND is_group_member(family_group_id)));
CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (user_id = auth.uid());

-- user_category_preferences: sólo propias
CREATE POLICY "ucp_all" ON user_category_preferences
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- family_groups: visible para miembros activos o dueño
CREATE POLICY "family_groups_read" ON family_groups FOR SELECT
  USING (owner_id = auth.uid() OR is_group_member(id));
CREATE POLICY "family_groups_insert" ON family_groups FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "family_groups_update" ON family_groups FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "family_groups_delete" ON family_groups FOR DELETE
  USING (owner_id = auth.uid());

-- family_group_participants
CREATE POLICY "fgp_read" ON family_group_participants FOR SELECT
  USING (user_id = auth.uid() OR is_group_member(group_id));
CREATE POLICY "fgp_insert" ON family_group_participants FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM family_groups WHERE id = group_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "fgp_update" ON family_group_participants FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM family_groups WHERE id = group_id AND owner_id = auth.uid()));
CREATE POLICY "fgp_delete" ON family_group_participants FOR DELETE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM family_groups WHERE id = group_id AND owner_id = auth.uid()));

-- balances
CREATE POLICY "balances_read" ON balances FOR SELECT
  USING (user_id = auth.uid() OR is_group_member(group_id));
CREATE POLICY "balances_write" ON balances FOR ALL
  USING (is_group_member(group_id)) WITH CHECK (is_group_member(group_id));

-- user_payment_methods: sólo propios
CREATE POLICY "payment_methods_all" ON user_payment_methods
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- incomes: sólo propios
CREATE POLICY "incomes_all" ON incomes
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- budgets: propios + del grupo
CREATE POLICY "budgets_read" ON budgets FOR SELECT
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND is_group_member(family_group_id)));
CREATE POLICY "budgets_insert" ON budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "budgets_update" ON budgets FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "budgets_delete" ON budgets FOR DELETE
  USING (user_id = auth.uid());

-- transactions: propias + del grupo
CREATE POLICY "transactions_read" ON transactions FOR SELECT
  USING (user_id = auth.uid() OR (family_group_id IS NOT NULL AND is_group_member(family_group_id)));
CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update" ON transactions FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "transactions_delete" ON transactions FOR DELETE
  USING (user_id = auth.uid());

-- transaction_participants
CREATE POLICY "tp_read" ON transaction_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_id
        AND t.family_group_id IS NOT NULL
        AND is_group_member(t.family_group_id)
    )
  );
CREATE POLICY "tp_insert" ON transaction_participants FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
  );
CREATE POLICY "tp_delete" ON transaction_participants FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
  );

-- ============================================================
-- DATOS SEMILLA
-- ============================================================

-- Monedas
INSERT INTO currencies (code, name, symbol) VALUES
  ('USD', 'Dólar estadounidense', '$'),
  ('EUR', 'Euro',                 '€'),
  ('PYG', 'Guaraní paraguayo',    '₲'),
  ('ARS', 'Peso argentino',       '$'),
  ('BRL', 'Real brasileño',       'R$'),
  ('CLP', 'Peso chileno',         '$'),
  ('COP', 'Peso colombiano',      '$'),
  ('MXN', 'Peso mexicano',        '$')
ON CONFLICT (code) DO NOTHING;

-- Tipos de transacción globales (user_id NULL)
INSERT INTO transaction_types (id, user_id, name) VALUES
  (gen_random_uuid(), NULL, 'fijo'),
  (gen_random_uuid(), NULL, 'variable'),
  (gen_random_uuid(), NULL, 'ocasional'),
  (gen_random_uuid(), NULL, 'deuda'),
  (gen_random_uuid(), NULL, 'reintegro')
ON CONFLICT DO NOTHING;

-- Categorías globales de gastos
INSERT INTO categories (id, user_id, family_group_id, name, category_type) VALUES
  (gen_random_uuid(), NULL, NULL, 'Alimentación',       'expense'),
  (gen_random_uuid(), NULL, NULL, 'Transporte',         'expense'),
  (gen_random_uuid(), NULL, NULL, 'Vivienda',           'expense'),
  (gen_random_uuid(), NULL, NULL, 'Salud',              'expense'),
  (gen_random_uuid(), NULL, NULL, 'Educación',          'expense'),
  (gen_random_uuid(), NULL, NULL, 'Entretenimiento',    'expense'),
  (gen_random_uuid(), NULL, NULL, 'Ropa y calzado',     'expense'),
  (gen_random_uuid(), NULL, NULL, 'Tecnología',         'expense'),
  (gen_random_uuid(), NULL, NULL, 'Servicios',          'expense'),
  (gen_random_uuid(), NULL, NULL, 'Mascotas',           'expense'),
  (gen_random_uuid(), NULL, NULL, 'Viajes',             'expense'),
  (gen_random_uuid(), NULL, NULL, 'Otros gastos',       'expense')
ON CONFLICT DO NOTHING;

-- Categorías globales de ingresos
INSERT INTO categories (id, user_id, family_group_id, name, category_type) VALUES
  (gen_random_uuid(), NULL, NULL, 'Salario',            'income'),
  (gen_random_uuid(), NULL, NULL, 'Freelance',          'income'),
  (gen_random_uuid(), NULL, NULL, 'Inversiones',        'income'),
  (gen_random_uuid(), NULL, NULL, 'Alquiler',           'income'),
  (gen_random_uuid(), NULL, NULL, 'Ventas',             'income'),
  (gen_random_uuid(), NULL, NULL, 'Otros ingresos',     'income')
ON CONFLICT DO NOTHING;
