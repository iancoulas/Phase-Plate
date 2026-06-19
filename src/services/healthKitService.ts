import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HealthStats {
  steps: number | null;
  activeCalories: number | null;
  restingHR: number | null;
  lastWorkout: { name: string; duration: number; date: Date } | null;
  lastSyncedAt: Date | null;
  permissionsGranted: boolean;
}

const CACHE_KEY = '@health_stats_cache';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

let AppleHealthKit: {
  initHealthKit: (opts: object, cb: (err: unknown) => void) => void;
  getStepCount: (opts: object, cb: (err: unknown, results: { value: number }) => void) => void;
  getActiveEnergyBurned: (opts: object, cb: (err: unknown, results: Array<{ value: number }>) => void) => void;
  getHeartRateSamples: (opts: object, cb: (err: unknown, results: Array<{ value: number }>) => void) => void;
  getSamples: (opts: object, cb: (err: unknown, results: Array<{ activityName: string; duration: number; startDate: string }>) => void) => void;
} | null = null;

let GoogleFit: {
  authorize: (opts: object) => Promise<{ success: boolean }>;
  getDailyStepCountSamples: (opts: object) => Promise<Array<{ steps: Array<{ date: string; value: number }> }>>;
  getDailyCalorieSamples: (opts: object) => Promise<Array<{ calorie: number }>>;
} | null = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch { /* not linked */ }
} else {
  try {
    GoogleFit = require('react-native-google-fit').default;
  } catch { /* not linked */ }
}

const HK_PERMS = {
  permissions: {
    read: ['StepCount', 'ActiveEnergyBurned', 'RestingHeartRate', 'HeartRateSample', 'Workout'],
    write: [],
  },
};

export async function requestHealthPermissions(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    if (!AppleHealthKit) return false;
    return new Promise(resolve => {
      AppleHealthKit!.initHealthKit(HK_PERMS, (err) => resolve(!err));
    });
  } else {
    if (!GoogleFit) return false;
    try {
      const result = await GoogleFit.authorize({
        scopes: ['FITNESS_ACTIVITY_READ', 'FITNESS_BODY_READ'],
      });
      return result.success;
    } catch {
      return false;
    }
  }
}

async function fetchIOSStats(): Promise<Partial<HealthStats>> {
  if (!AppleHealthKit) return {};
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();

  const steps = await new Promise<number | null>(resolve => {
    AppleHealthKit!.getStepCount({ date: startOfDay }, (err, res) =>
      resolve(err ? null : res.value)
    );
  });

  const activeCalories = await new Promise<number | null>(resolve => {
    AppleHealthKit!.getActiveEnergyBurned(
      { startDate: startOfDay, endDate: new Date().toISOString() },
      (err, results) => resolve(err ? null : results.reduce((s, r) => s + r.value, 0))
    );
  });

  const restingHR = await new Promise<number | null>(resolve => {
    AppleHealthKit!.getHeartRateSamples(
      { startDate: startOfDay, endDate: new Date().toISOString(), limit: 1 },
      (err, results) => resolve(err || !results.length ? null : results[0].value)
    );
  });

  const workout = await new Promise<HealthStats['lastWorkout']>(resolve => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    AppleHealthKit!.getSamples(
      { startDate: sevenDaysAgo, endDate: new Date().toISOString(), type: 'Workout' },
      (err, results) => {
        if (err || !results.length) return resolve(null);
        const w = results[results.length - 1];
        resolve({ name: w.activityName, duration: w.duration, date: new Date(w.startDate) });
      }
    );
  });

  return { steps, activeCalories, restingHR, lastWorkout: workout, permissionsGranted: true };
}

async function fetchAndroidStats(): Promise<Partial<HealthStats>> {
  // Google Fit API was sunset 2025-06-30. Returns zeros until Health Connect migration.
  return { steps: null, activeCalories: null, restingHR: null, lastWorkout: null, permissionsGranted: false };
}

export async function fetchTodayStats(): Promise<HealthStats> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as HealthStats & { cachedAt: number };
      if (Date.now() - parsed.cachedAt < CACHE_TTL_MS) {
        return { ...parsed, lastSyncedAt: new Date(parsed.lastSyncedAt!) };
      }
    }
  } catch { /* cache miss */ }

  const partial = Platform.OS === 'ios' ? await fetchIOSStats() : await fetchAndroidStats();

  const stats: HealthStats = {
    steps: null,
    activeCalories: null,
    restingHR: null,
    lastWorkout: null,
    lastSyncedAt: new Date(),
    permissionsGranted: false,
    ...partial,
  };

  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ...stats, cachedAt: Date.now() }));
  return stats;
}
