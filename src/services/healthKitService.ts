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

let HealthConnect: typeof import('react-native-health-connect') | null = null;

if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch { /* not linked */ }
} else {
  try {
    HealthConnect = require('react-native-health-connect');
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
    if (!HealthConnect) return false;
    try {
      const isInitialized = await HealthConnect.initialize();
      if (!isInitialized) return false;
      const granted = await HealthConnect.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ]);
      return granted.length > 0;
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
  const empty: Partial<HealthStats> = { steps: null, activeCalories: null, restingHR: null, lastWorkout: null, permissionsGranted: false };
  if (!HealthConnect) return empty;

  try {
    const isInitialized = await HealthConnect.initialize();
    if (!isInitialized) return empty;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const now = new Date().toISOString();

    const stepsResult = await HealthConnect.readRecords('Steps', {
      timeRangeFilter: { operator: 'between', startTime: startOfDay, endTime: now },
    });
    const steps = stepsResult.records.reduce((sum, r) => sum + r.count, 0);

    const caloriesResult = await HealthConnect.readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: { operator: 'between', startTime: startOfDay, endTime: now },
    });
    const activeCalories = caloriesResult.records.reduce((sum, r) => sum + r.energy.inKilocalories, 0);

    const hrResult = await HealthConnect.readRecords('RestingHeartRate', {
      timeRangeFilter: { operator: 'between', startTime: startOfDay, endTime: now },
    });
    const restingHR = hrResult.records.length ? hrResult.records[hrResult.records.length - 1].beatsPerMinute : null;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const exerciseResult = await HealthConnect.readRecords('ExerciseSession', {
      timeRangeFilter: { operator: 'between', startTime: sevenDaysAgo, endTime: now },
    });
    const lastWorkout = exerciseResult.records.length
      ? (() => {
          const w = exerciseResult.records[exerciseResult.records.length - 1];
          const durationSeconds = (new Date(w.endTime).getTime() - new Date(w.startTime).getTime()) / 1000;
          return { name: w.title ?? 'Workout', duration: durationSeconds, date: new Date(w.startTime) };
        })()
      : null;

    return { steps, activeCalories, restingHR, lastWorkout, permissionsGranted: true };
  } catch {
    return empty;
  }
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
