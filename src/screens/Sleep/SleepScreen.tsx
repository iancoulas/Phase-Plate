import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { saveSleepLog, fetchSleepLogs, SleepLog, EnergyLevel } from '../../services/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcSleepHours(bedH: number, bedM: number, wakeH: number, wakeM: number): number {
  const bedMins = bedH * 60 + bedM;
  const wakeMins = wakeH * 60 + wakeM;
  const diff = wakeMins >= bedMins ? wakeMins - bedMins : 1440 - bedMins + wakeMins;
  return Math.round((diff / 60) * 10) / 10;
}

function parseDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === toDateString(today)) return 'Today';
  if (dateStr === toDateString(yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const TEAL = '#2C5364';

// ─── Sub-components ───────────────────────────────────────────────────────────

function TimeStepper({
  label, hour, minute,
  onHourDec, onHourInc, onMinDec, onMinInc,
}: {
  label: string; hour: number; minute: number;
  onHourDec: () => void; onHourInc: () => void;
  onMinDec: () => void;  onMinInc: () => void;
}) {
  return (
    <View style={ts.row}>
      <Text style={ts.label}>{label}</Text>
      <View style={ts.controls}>
        <View style={ts.unit}>
          <TouchableOpacity style={ts.btn} onPress={onHourDec}><Text style={ts.btnText}>−</Text></TouchableOpacity>
          <Text style={ts.val}>{String(hour % 12 || 12).padStart(2, '0')}</Text>
          <TouchableOpacity style={ts.btn} onPress={onHourInc}><Text style={ts.btnText}>+</Text></TouchableOpacity>
        </View>
        <Text style={ts.colon}>:</Text>
        <View style={ts.unit}>
          <TouchableOpacity style={ts.btn} onPress={onMinDec}><Text style={ts.btnText}>−</Text></TouchableOpacity>
          <Text style={ts.val}>{String(minute).padStart(2, '0')}</Text>
          <TouchableOpacity style={ts.btn} onPress={onMinInc}><Text style={ts.btnText}>+</Text></TouchableOpacity>
        </View>
        <Text style={ts.ampm}>{hour >= 12 ? 'PM' : 'AM'}</Text>
      </View>
    </View>
  );
}

const ts = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  label:    { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unit:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E8F0F5', justifyContent: 'center', alignItems: 'center' },
  btnText:  { fontSize: 18, color: TEAL, fontWeight: '600', lineHeight: 22 },
  val:      { fontSize: 18, fontWeight: '700', color: '#1a1a1a', minWidth: 28, textAlign: 'center' },
  colon:    { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  ampm:     { fontSize: 13, fontWeight: '600', color: '#666', marginLeft: 2, minWidth: 26 },
});

const ENERGY_OPTIONS: { key: EnergyLevel; label: string }[] = [
  { key: 'sluggish',  label: 'Sluggish' },
  { key: 'low',       label: 'Low' },
  { key: 'normal',    label: 'Normal' },
  { key: 'high',      label: 'High' },
  { key: 'energized', label: 'Energized' },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SleepScreen() {
  const today = toDateString(new Date());
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sheet form state — defaults: 10 PM bedtime, 6 AM wake
  const [bedH, setBedH]   = useState(22);
  const [bedM, setBedM]   = useState(0);
  const [wakeH, setWakeH] = useState(6);
  const [wakeM, setWakeM] = useState(0);
  const [quality, setQuality]       = useState<number | null>(null);
  const [energy, setEnergy]         = useState<EnergyLevel | null>(null);
  const [notes, setNotes]           = useState('');

  const slideAnim = useRef(new Animated.Value(400)).current;

  const loadLogs = useCallback(async () => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    const data = await fetchSleepLogs(toDateString(start), today);
    setLogs(data);
    setLoading(false);
  }, [today]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const todayLog = logs.find(l => l.log_date === today) ?? null;

  function openSheet() {
    // Pre-fill from today's log if it exists
    if (todayLog) {
      const [bh, bm] = todayLog.bedtime?.split(':').map(Number) ?? [22, 0];
      const [wh, wm] = todayLog.wake_time?.split(':').map(Number) ?? [6, 0];
      setBedH(bh); setBedM(bm); setWakeH(wh); setWakeM(wm);
      setQuality(todayLog.quality ?? null);
      setEnergy(todayLog.energy_level ?? null);
      setNotes(todayLog.notes ?? '');
    } else {
      setBedH(22); setBedM(0); setWakeH(6); setWakeM(0);
      setQuality(null); setEnergy(null); setNotes('');
    }
    setSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
  }

  function closeSheet() {
    Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }).start(() => setSheetVisible(false));
  }

  async function handleSave() {
    setSaving(true);
    const bedtime   = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;
    const wake_time = `${String(wakeH).padStart(2, '0')}:${String(wakeM).padStart(2, '0')}`;
    const sleep_hours = calcSleepHours(bedH, bedM, wakeH, wakeM);
    await saveSleepLog({
      log_date: today,
      bedtime,
      wake_time,
      sleep_hours,
      quality:      quality ?? undefined,
      energy_level: energy ?? undefined,
      notes:        notes.trim() || undefined,
    });
    setSaving(false);
    closeSheet();
    loadLogs();
  }

  const recentLogs = logs.filter(l => l.log_date !== today);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Sleep & Energy</Text>
        <Text style={styles.dateLabel}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

        {/* Today's card */}
        <View style={styles.card}>
          {loading ? (
            <Text style={styles.emptyText}>Loading…</Text>
          ) : todayLog ? (
            <View style={styles.logSummary}>
              <View style={styles.summaryRow}>
                <Ionicons name="bed-outline" size={18} color={TEAL} />
                <Text style={styles.summaryText}>
                  {formatTime(...(todayLog.bedtime?.split(':').map(Number) as [number, number]) ?? [22, 0])}
                  {'  →  '}
                  {formatTime(...(todayLog.wake_time?.split(':').map(Number) as [number, number]) ?? [6, 0])}
                </Text>
                {todayLog.sleep_hours != null && (
                  <Text style={styles.hoursChip}>{todayLog.sleep_hours}h</Text>
                )}
              </View>
              {todayLog.quality != null && (
                <View style={styles.summaryRow}>
                  <Ionicons name="star" size={16} color={TEAL} />
                  <Text style={styles.summaryText}>Quality {todayLog.quality}/5</Text>
                  {todayLog.energy_level && (
                    <Text style={styles.energyChip}>{todayLog.energy_level}</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No sleep logged for today.</Text>
          )}

          <TouchableOpacity style={styles.logBtn} onPress={openSheet}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.logBtnText}>{todayLog ? 'Edit Today' : 'Log Sleep'}</Text>
          </TouchableOpacity>
        </View>

        {/* Recent history */}
        {recentLogs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>RECENT</Text>
            <View style={styles.historyCard}>
              {recentLogs.map((log, i) => (
                <View key={log.log_date} style={[styles.historyRow, i < recentLogs.length - 1 && styles.historyDivider]}>
                  <Text style={styles.historyDate}>{parseDateLabel(log.log_date)}</Text>
                  <View style={styles.historyRight}>
                    {log.sleep_hours != null && (
                      <Text style={styles.historyHours}>{log.sleep_hours}h</Text>
                    )}
                    {log.bedtime && log.wake_time && (
                      <Text style={styles.historyTime}>
                        {formatTime(...(log.bedtime.split(':').map(Number) as [number, number]))}
                        {' – '}
                        {formatTime(...(log.wake_time.split(':').map(Number) as [number, number]))}
                      </Text>
                    )}
                    {log.quality != null && (
                      <Text style={styles.historyQuality}>{'★'.repeat(log.quality)}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Log sheet modal */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>Log Sleep</Text>

              <View style={styles.sheetSection}>
                <TimeStepper
                  label="Bedtime"
                  hour={bedH} minute={bedM}
                  onHourDec={() => setBedH(h => (h + 23) % 24)}
                  onHourInc={() => setBedH(h => (h + 1)  % 24)}
                  onMinDec={() =>  setBedM(m => (m + 45) % 60)}
                  onMinInc={() =>  setBedM(m => (m + 15) % 60)}
                />
                <View style={styles.divider} />
                <TimeStepper
                  label="Wake time"
                  hour={wakeH} minute={wakeM}
                  onHourDec={() => setWakeH(h => (h + 23) % 24)}
                  onHourInc={() => setWakeH(h => (h + 1)  % 24)}
                  onMinDec={() =>  setWakeM(m => (m + 45) % 60)}
                  onMinInc={() =>  setWakeM(m => (m + 15) % 60)}
                />
                <Text style={styles.sleepHoursNote}>
                  {calcSleepHours(bedH, bedM, wakeH, wakeM)} hours of sleep
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Sleep Quality</Text>
              <View style={styles.sheetSection}>
                <View style={styles.optionRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.numberBtn, quality === n && styles.numberBtnSelected]}
                      onPress={() => setQuality(quality === n ? null : n)}
                    >
                      <Text style={[styles.numberBtnText, quality === n && styles.numberBtnTextSelected]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.scaleHint}>1 = Poor sleep  ·  5 = Excellent sleep</Text>
              </View>

              <Text style={styles.fieldLabel}>Energy Level</Text>
              <View style={styles.sheetSection}>
                <View style={styles.chipRow}>
                  {ENERGY_OPTIONS.map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, energy === key && styles.chipSelected]}
                      onPress={() => setEnergy(energy === key ? null : key)}
                    >
                      <Text style={[styles.chipText, energy === key && styles.chipTextSelected]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <View style={styles.sheetSection}>
                <TextInput
                  style={styles.textArea}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="How did you sleep? Any observations…"
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f8f8f8' },
  scroll:      { padding: 16, paddingBottom: 40 },
  heading:     { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  dateLabel:   { fontSize: 14, color: '#888', marginBottom: 20 },
  sectionLabel:{ fontSize: 12, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, marginTop: 24, marginBottom: 8 },

  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 14 },
  emptyText:   { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 4 },
  logSummary:  { gap: 8 },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 15, color: '#1a1a1a' },
  hoursChip:   { backgroundColor: '#E8F0F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 13, fontWeight: '600', color: TEAL },
  energyChip:  { backgroundColor: '#E8F0F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 13, color: TEAL, textTransform: 'capitalize' },
  logBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: TEAL, borderRadius: 10, paddingVertical: 12 },
  logBtnText:  { color: '#fff', fontWeight: '700', fontSize: 15 },

  historyCard:  { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' },
  historyRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  historyDivider: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  historyDate:  { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyHours: { fontSize: 14, fontWeight: '700', color: TEAL },
  historyTime:  { fontSize: 13, color: '#888' },
  historyQuality: { fontSize: 13, color: '#f4a300', letterSpacing: -1 },

  // Sheet
  overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '90%' },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetTitle:  { fontSize: 20, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 20, paddingVertical: 14 },
  sheetSection:{ backgroundColor: '#f8f8f8', borderRadius: 12, marginHorizontal: 16, marginBottom: 4, padding: 14 },
  divider:     { height: 1, backgroundColor: '#eee', marginVertical: 4 },
  sleepHoursNote: { fontSize: 13, color: TEAL, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: '#555', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  optionRow:   { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  numberBtn:   { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  numberBtnSelected: { borderColor: TEAL, backgroundColor: TEAL },
  numberBtnText: { fontSize: 16, fontWeight: '700', color: '#666' },
  numberBtnTextSelected: { color: '#fff' },
  scaleHint:   { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 8 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa' },
  chipSelected:{ borderColor: TEAL, backgroundColor: '#E8F0F5' },
  chipText:    { fontSize: 14, color: '#555' },
  chipTextSelected: { color: TEAL, fontWeight: '600' },
  textArea:    { fontSize: 15, color: '#1a1a1a', minHeight: 80 },
  saveBtn:     { margin: 16, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
