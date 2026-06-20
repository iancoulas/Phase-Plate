-- Run this in Supabase Dashboard > SQL Editor > New query
-- Required for cycle settings to save from onboarding and CycleContext

CREATE TABLE IF NOT EXISTS cycle_overrides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  last_period_date DATE NOT NULL,
  cycle_length     SMALLINT DEFAULT 28,
  period_length    SMALLINT DEFAULT 5,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cycle_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own cycle overrides" ON cycle_overrides FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- After running the above, verify all four tables exist with this query:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('menstruation_logs', 'food_logs', 'user_preferences', 'cycle_overrides');
