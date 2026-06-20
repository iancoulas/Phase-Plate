import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ensurePermissions,
  schedulePillReminder,
  schedulePeriodPredictionAlert,
  schedulePhaseTransitionAlert,
  cancelAllPhasePlateNotifications,
} from '../../services/NotificationService';
import { fetchUserPreferences, saveNotificationSettings, NotificationSettings } from '../../services/supabase';
import { useCycle } from '../../contexts/CycleContext';
import { calculateCyclePhase } from '../../utils/cycleCalculator';

const DEFAULT_PREFS: NotificationSettings = {
  pillReminder: false,
  pillReminderTime: '08:00',
  periodAlert: false,
  periodAlertDaysBefore: 2,
  phaseTransition: false,
};

export default function NotificationSettingsScreen() {
  const { lastPeriodDate, cycleLength, periodLength } = useCycle();
  const [prefs, setPrefs] = useState<NotificationSettings>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPreferences().then(data => {
      if (data?.notification_settings) setPrefs({ ...DEFAULT_PREFS, ...data.notification_settings });
      setLoading(false);
    });
    ensurePermissions();
  }, []);

  const applyAndSave = useCallback(async (next: NotificationSettings) => {
    setPrefs(next);
    await saveNotificationSettings(next);

    // Cancel everything first, then reschedule only what is enabled.
    // This ensures toggling one notification off doesn't leave it firing.
    await cancelAllPhasePlateNotifications();

    const [hour, minute] = (next.pillReminderTime ?? '08:00').split(':').map(Number);

    if (next.pillReminder) {
      await schedulePillReminder(hour, minute);
    }

    if (next.periodAlert) {
      const phase = calculateCyclePhase({ lastPeriodDate, cycleLength, periodLength });
      await schedulePeriodPredictionAlert(phase.nextPeriodDate, next.periodAlertDaysBefore ?? 2);
    }

    if (next.phaseTransition) {
      const phase = calculateCyclePhase({ lastPeriodDate, cycleLength, periodLength });
      const nextPhaseDate = new Date();
      nextPhaseDate.setDate(nextPhaseDate.getDate() + phase.daysUntilNextPhase + 1);
      await schedulePhaseTransitionAlert(nextPhaseDate, phase.phase);
    }
  }, [lastPeriodDate, cycleLength, periodLength]);

  if (loading) return null;

  function toggle(key: keyof NotificationSettings, value: boolean) {
    applyAndSave({ ...prefs, [key]: value });
  }

  function adjustDays(delta: number) {
    const next = Math.max(1, Math.min(7, (prefs.periodAlertDaysBefore ?? 2) + delta));
    applyAndSave({ ...prefs, periodAlertDaysBefore: next });
  }

  function adjustHour(delta: number) {
    const [h, m] = (prefs.pillReminderTime ?? '08:00').split(':').map(Number);
    const newH = (h + delta + 24) % 24;
    applyAndSave({ ...prefs, pillReminderTime: `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}` });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Notifications</Text>

        {/* Pill reminder */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Pill Reminder</Text>
              <Text style={styles.rowSub}>Daily reminder to take your pill</Text>
            </View>
            <Switch value={!!prefs.pillReminder} onValueChange={v => toggle('pillReminder', v)} trackColor={{ true: '#9B59B6' }} />
          </View>
          {prefs.pillReminder && (
            <View style={styles.stepRow}>
              <Text style={styles.stepLabel}>Time</Text>
              <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.stepBtn}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.stepValue}>{prefs.pillReminderTime}</Text>
              <TouchableOpacity onPress={() => adjustHour(1)} style={styles.stepBtn}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* Period alert */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Period Alert</Text>
              <Text style={styles.rowSub}>Heads up before your next period</Text>
            </View>
            <Switch value={!!prefs.periodAlert} onValueChange={v => toggle('periodAlert', v)} trackColor={{ true: '#9B59B6' }} />
          </View>
          {prefs.periodAlert && (
            <View style={styles.stepRow}>
              <Text style={styles.stepLabel}>Days before</Text>
              <TouchableOpacity onPress={() => adjustDays(-1)} style={styles.stepBtn}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.stepValue}>{prefs.periodAlertDaysBefore}</Text>
              <TouchableOpacity onPress={() => adjustDays(1)} style={styles.stepBtn}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
            </View>
          )}
        </View>

        {/* Phase transition */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Phase Transitions</Text>
              <Text style={styles.rowSub}>Notify when a new cycle phase starts</Text>
            </View>
            <Switch value={!!prefs.phaseTransition} onValueChange={v => toggle('phaseTransition', v)} trackColor={{ true: '#9B59B6' }} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 16 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  section: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  rowSub: { fontSize: 13, color: '#888', marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  stepLabel: { flex: 1, fontSize: 14, color: '#555' },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  stepBtnText: { fontSize: 18, color: '#9B59B6', fontWeight: '600' },
  stepValue: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', minWidth: 40, textAlign: 'center' },
});
