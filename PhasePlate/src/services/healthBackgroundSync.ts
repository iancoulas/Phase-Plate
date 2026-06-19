import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchTodayStats } from './healthKitService';

const TASK_NAME = 'HEALTH_BACKGROUND_SYNC';

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await fetchTodayStats();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerHealthBackgroundSync() {
  try {
    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 6 * 60 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (err) {
    console.warn('[healthBackgroundSync] register failed:', err);
  }
}
