-- Run this in Supabase Dashboard > SQL Editor > New query
-- All five tables required for the app to function

-- ── menstruation_logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menstruation_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  log_date     DATE NOT NULL,
  cramp_level  SMALLINT CHECK (cramp_level BETWEEN 1 AND 5),
  mood         TEXT,
  flow_level   TEXT CHECK (flow_level IN ('none','light','medium','heavy','very_heavy')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);
ALTER TABLE menstruation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own logs" ON menstruation_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── food_logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  log_date    DATE NOT NULL,
  meal_name   TEXT NOT NULL,
  calories    NUMERIC,
  protein_g   NUMERIC,
  carbs_g     NUMERIC,
  fat_g       NUMERIC,
  fiber_g     NUMERIC,
  iron_mg     NUMERIC,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own food logs" ON food_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── user_preferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_profile    JSONB,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own preferences" ON user_preferences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── cycle_overrides ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycle_overrides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  last_period_date DATE NOT NULL,
  cycle_length     SMALLINT DEFAULT 28,
  period_length    SMALLINT DEFAULT 5,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)
);
ALTER TABLE cycle_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cycle overrides" ON cycle_overrides FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── sleep_logs ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sleep_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  log_date     DATE NOT NULL,
  bedtime      TEXT,
  wake_time    TEXT,
  sleep_hours  NUMERIC,
  quality      SMALLINT CHECK (quality BETWEEN 1 AND 5),
  energy_level TEXT CHECK (energy_level IN ('sluggish','low','normal','high','energized')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, log_date)
);
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sleep logs" ON sleep_logs FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- Verify all five tables exist:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('menstruation_logs', 'food_logs', 'user_preferences', 'cycle_overrides', 'sleep_logs')
ORDER BY table_name;


-- ── analyze-meal Edge Function ──────────────────────────────────────────────
-- Proxies OpenAI GPT-4o Vision so the API key never ships in the client bundle.
-- Source: supabase/functions/analyze-meal/index.ts
-- Deploy (run from repo root, requires Supabase CLI logged in and project linked):
--   supabase secrets set OPENAI_API_KEY=sk-...
--   supabase functions deploy analyze-meal
