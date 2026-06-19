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
import { useCycle } from '../../contexts/CycleContext';

function DateStepper({ label, value, onMinus, onPlus }: { label: string; value: string | number; onMinus: () => void; onPlus: () => void }) {
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

  const [lpDate, setLpDate] = useState(new Date(lastPeriodDate));
  const [cLen, setCLen] = useState(cycleLength);
  const [pLen, setPLen] = useState(periodLength);
  const [saving, setSaving] = useState(false);

  function adjustDays(delta: number) {
    const d = new Date(lpDate);
    d.setDate(d.getDate() + delta);
    setLpDate(d);
  }

  async function handleSave() {
    setSaving(true);
    await updateCycleSettings({
      last_period_date: lpDate.toISOString().split('T')[0],
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
          <DateStepper
            label="Last period started"
            value={lpDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            onMinus={() => adjustDays(-1)}
            onPlus={() => adjustDays(1)}
          />
          <DateStepper
            label="Cycle length (days)"
            value={cLen}
            onMinus={() => setCLen(n => Math.max(21, n - 1))}
            onPlus={() => setCLen(n => Math.min(45, n + 1))}
          />
          <DateStepper
            label="Period length (days)"
            value={pLen}
            onMinus={() => setPLen(n => Math.max(1, n - 1))}
            onPlus={() => setPLen(n => Math.min(10, n + 1))}
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
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 20 },
  heading: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8 },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  stepperLabel: { fontSize: 15, color: '#1a1a1a', flex: 1 },
  stepperControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  stepBtnText: { fontSize: 20, color: '#9B59B6', fontWeight: '600', lineHeight: 24 },
  stepValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', minWidth: 80, textAlign: 'center' },
  saveBtn: { marginTop: 24, backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
