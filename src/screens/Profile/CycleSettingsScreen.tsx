import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Calendar from 'react-native-calendars/src/calendar';
import type { DateData } from 'react-native-calendars/src/types';

import { useCycle } from '../../contexts/CycleContext';

const TODAY = new Date().toISOString().split('T')[0];
const ROSE  = '#8B3A5A';

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: number; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControl}>
        <TouchableOpacity style={styles.stepBtn} onPress={onMinus}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={onPlus}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export default function CycleSettingsScreen() {
  const navigation = useNavigation();
  const { lastPeriodDate, cycleLength, periodLength, updateCycleSettings } = useCycle();

  const [lpDate, setLpDate]         = useState(new Date(lastPeriodDate));
  const [cLen, setCLen]             = useState(cycleLength);
  const [pLen, setPLen]             = useState(periodLength);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving]         = useState(false);

  const selectedDateStr = lpDate.toISOString().split('T')[0];

  function onDayPress(day: DateData) {
    setLpDate(new Date(day.dateString + 'T12:00:00'));
    setShowCalendar(false);
  }

  async function handleSave() {
    setSaving(true);
    await updateCycleSettings({
      last_period_date: selectedDateStr,
      cycle_length: cLen,
      period_length: pLen,
    });
    setSaving(false);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Cycle Settings</Text>
        <Text style={styles.sub}>Set your last period date and cycle parameters. These drive all phase calculations.</Text>

        <View style={styles.card}>
          {/* Last period date — tapping the row toggles the inline calendar */}
          <TouchableOpacity style={styles.dateRow} onPress={() => setShowCalendar(v => !v)} activeOpacity={0.7}>
            <Text style={styles.stepperLabel}>Last period started</Text>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>
                {lpDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <Ionicons name={showCalendar ? 'chevron-up' : 'calendar-outline'} size={16} color={ROSE} />
            </View>
          </TouchableOpacity>

          {showCalendar && (
            <Calendar
              current={selectedDateStr}
              maxDate={TODAY}
              onDayPress={onDayPress}
              markedDates={{
                [selectedDateStr]: { selected: true, selectedColor: ROSE },
              }}
              theme={{
                backgroundColor: '#fff',
                calendarBackground: '#fff',
                todayTextColor: ROSE,
                arrowColor: ROSE,
                selectedDayBackgroundColor: ROSE,
                dotColor: ROSE,
              }}
            />
          )}

          <View style={styles.divider} />

          <Stepper
            label="Cycle length (days)"
            value={cLen}
            onMinus={() => setCLen(n => Math.max(21, n - 1))}
            onPlus={() =>  setCLen(n => Math.min(45, n + 1))}
          />
          <Stepper
            label="Period length (days)"
            value={pLen}
            onMinus={() => setPLen(n => Math.max(1, n - 1))}
            onPlus={() =>  setPLen(n => Math.min(10, n + 1))}
          />
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8f8f8' },
  content:      { padding: 20, paddingBottom: 40 },
  heading:      { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  sub:          { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  card:         { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  dateRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  dateBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText:     { fontSize: 15, fontWeight: '600', color: ROSE },
  divider:      { height: 1, backgroundColor: '#f0f0f0', marginHorizontal: 16 },
  stepperRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  stepperLabel: { fontSize: 15, color: '#1a1a1a', flex: 1 },
  stepperControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn:      { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  stepBtnText:  { fontSize: 20, color: '#9B59B6', fontWeight: '600', lineHeight: 24 },
  stepValue:    { fontSize: 15, fontWeight: '600', color: '#1a1a1a', minWidth: 32, textAlign: 'center' },
  saveBtn:      { marginTop: 24, backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
});
