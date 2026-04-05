-- =============================================================
-- Push Notification Subscriptions — TEKO CASH
-- Stores Web Push API subscription endpoints per user/device
-- =============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth_key     TEXT NOT NULL,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Push subs: full access own" ON public.push_subscriptions;
CREATE POLICY "Push subs: full access own" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Service role can read all (needed by Edge Function to send pushes)
DROP POLICY IF EXISTS "Push subs: service role read all" ON public.push_subscriptions;
CREATE POLICY "Push subs: service role read all" ON public.push_subscriptions
  FOR SELECT USING (auth.role() = 'service_role');

-- =============================================================
-- Notification Log — persists in-app notification history
-- =============================================================

CREATE TABLE IF NOT EXISTS public.notification_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('budget_warn', 'budget_over', 'weekly_report', 'monthly_report', 'reminder', 'system')),
  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notif log: full access own" ON public.notification_log;
CREATE POLICY "Notif log: full access own" ON public.notification_log
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Notif log: service role insert" ON public.notification_log;
CREATE POLICY "Notif log: service role insert" ON public.notification_log
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Index for fast per-user unread count
CREATE INDEX IF NOT EXISTS idx_notification_log_user_unread
  ON public.notification_log(user_id, read, created_at DESC);
