import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/*
  SQL schema — run once in Supabase SQL Editor:

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

  CREATE TABLE IF NOT EXISTS user_preferences (
    user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    notification_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    onboarding_profile    JSONB,
    updated_at            TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Users manage own preferences" ON user_preferences FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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
*/

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function ensureAnonSession(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      await supabase.auth.signInAnonymously();
    }
  } catch (err) {
    console.warn('[Supabase] ensureAnonSession failed:', err);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlowLevel = 'none' | 'light' | 'medium' | 'heavy' | 'very_heavy';
export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface MenstruationLog {
  id?: string;
  user_id?: string;
  log_date: string;
  cramp_level?: number;
  mood?: Mood;
  flow_level?: FlowLevel;
  notes?: string;
}

export interface FoodLog {
  id?: string;
  user_id?: string;
  log_date: string;
  meal_name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  iron_mg?: number;
  notes?: string;
}

export interface NotificationSettings {
  pillReminder?: boolean;
  pillReminderTime?: string;
  periodAlert?: boolean;
  periodAlertDaysBefore?: number;
  phaseTransition?: boolean;
  customReminders?: Array<{ id: string; title: string; body: string; hour: number; minute: number }>;
}

// ─── Menstruation logs ────────────────────────────────────────────────────────

export async function saveLog(log: Omit<MenstruationLog, 'id' | 'user_id'>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('menstruation_logs')
    .upsert(
      { ...log, user_id: user?.id },
      { onConflict: 'user_id,log_date' }
    );
  if (error) console.warn('[Supabase] saveLog error:', error.message);
}

export async function fetchLogsForMonth(year: number, month: number): Promise<MenstruationLog[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  const { data, error } = await supabase
    .from('menstruation_logs')
    .select('*')
    .gte('log_date', startDate)
    .lte('log_date', endDate);
  if (error) console.warn('[Supabase] fetchLogsForMonth error:', error.message);
  return data ?? [];
}

// ─── Food logs ────────────────────────────────────────────────────────────────

export async function saveFoodLog(log: Omit<FoodLog, 'id' | 'user_id'>): Promise<FoodLog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('food_logs')
    .insert({ ...log, user_id: user?.id })
    .select()
    .single();
  if (error) console.warn('[Supabase] saveFoodLog error:', error.message);
  return data ?? null;
}

export async function fetchFoodLogsForDate(date: string): Promise<FoodLog[]> {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('log_date', date)
    .order('created_at', { ascending: false });
  if (error) console.warn('[Supabase] fetchFoodLogsForDate error:', error.message);
  return data ?? [];
}

// ─── User preferences ─────────────────────────────────────────────────────────

export async function fetchUserPreferences(): Promise<{
  notification_settings: NotificationSettings;
  onboarding_profile: Record<string, unknown> | null;
} | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('notification_settings, onboarding_profile')
    .maybeSingle();
  if (error) console.warn('[Supabase] fetchUserPreferences error:', error.message);
  return data ?? null;
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user?.id, notification_settings: settings },
      { onConflict: 'user_id' }
    );
  if (error) console.warn('[Supabase] saveNotificationSettings error:', error.message);
}

export async function saveOnboardingProfile(profile: Record<string, unknown>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user?.id, onboarding_profile: profile },
      { onConflict: 'user_id' }
    );
  if (error) console.warn('[Supabase] saveOnboardingProfile error:', error.message);
}

export async function fetchOnboardingProfile(): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('onboarding_profile')
    .maybeSingle();
  if (error) console.warn('[Supabase] fetchOnboardingProfile error:', error.message);
  return data?.onboarding_profile ?? null;
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signInWithEmail(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

/**
 * Upgrades the current anonymous session to a real email/password account.
 * All existing user data is preserved because the user_id doesn't change.
 * If the Supabase project requires email confirmation, the user stays anonymous
 * until they click the verification link.
 */
export async function linkEmailToAnonymous(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.updateUser({ email, password });
  return error?.message ?? null;
}

export async function authSignOut(): Promise<void> {
  await supabase.auth.signOut();
  await ensureAnonSession();
}

// ─── Cycle overrides ──────────────────────────────────────────────────────────

export interface CycleOverride {
  last_period_date: string;
  cycle_length: number;
  period_length: number;
}

export async function saveCycleOverride(override: CycleOverride): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('cycle_overrides')
    .upsert(
      { ...override, user_id: user?.id },
      { onConflict: 'user_id' }
    );
  if (error) console.warn('[Supabase] saveCycleOverride error:', error.message);
}

export async function fetchCycleOverride(): Promise<CycleOverride | null> {
  const { data, error } = await supabase
    .from('cycle_overrides')
    .select('last_period_date, cycle_length, period_length')
    .maybeSingle();
  if (error) console.warn('[Supabase] fetchCycleOverride error:', error.message);
  return data ?? null;
}
