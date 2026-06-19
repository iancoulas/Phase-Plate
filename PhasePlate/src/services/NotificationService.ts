import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensurePermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('phaseplate', {
    name: 'PhasePlate',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function cancelAllPhasePlateNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as { kind?: string })?.kind?.startsWith('phaseplate.')) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}

export async function schedulePillReminder(hour: number, minute: number): Promise<string> {
  await ensureAndroidChannel();
  await cancelKind('phaseplate.pill');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pill reminder',
      body: "Don't forget your pill today.",
      data: { kind: 'phaseplate.pill' },
    },
    trigger: { hour, minute, repeats: true } as Notifications.NotificationTriggerInput,
  });
}

export async function schedulePeriodPredictionAlert(predictedStartDate: Date, daysBefore: number): Promise<string> {
  await ensureAndroidChannel();
  await cancelKind('phaseplate.period_alert');
  const fireDate = new Date(predictedStartDate);
  fireDate.setDate(fireDate.getDate() - daysBefore);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Period coming up',
      body: `Your period is predicted to start in ${daysBefore} day${daysBefore !== 1 ? 's' : ''}.`,
      data: { kind: 'phaseplate.period_alert' },
    },
    trigger: { date: fireDate } as Notifications.NotificationTriggerInput,
  });
}

export async function schedulePhaseTransitionAlert(nextPhaseDate: Date, phaseName: string): Promise<string> {
  await ensureAndroidChannel();
  await cancelKind('phaseplate.phase_transition');
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'New cycle phase starting',
      body: `Your ${phaseName} phase begins tomorrow.`,
      data: { kind: 'phaseplate.phase_transition' },
    },
    trigger: { date: new Date(nextPhaseDate.getTime() - 24 * 60 * 60 * 1000) } as Notifications.NotificationTriggerInput,
  });
}

export async function scheduleCustomReminder(opts: {
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}): Promise<string> {
  await ensureAndroidChannel();
  await cancelKind(`phaseplate.custom.${opts.id}`);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: opts.title,
      body: opts.body,
      data: { kind: `phaseplate.custom.${opts.id}` },
    },
    trigger: { hour: opts.hour, minute: opts.minute, repeats: true } as Notifications.NotificationTriggerInput,
  });
}

async function cancelKind(kind: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as { kind?: string })?.kind === kind) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
}
