import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Calendar from 'react-native-calendars/src/calendar';
import type { DateData } from 'react-native-calendars/src/types';
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

function formatDateLabel(dateStr: string): string {
  const today = toDateString(new Date());
  const yesterday = toDateString(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Sleep quality → colour ───────────────────────────────────────────────────

const QUALITY_COLORS: Record<number, { background: string; text: string }> = {
  5: { background: '#154360', text: '#fff' },
  4: { background: '#2471A3', text: '#fff' },
  3: { background: '#85C1E9', text: '#154360' },
  2: { background: '#FAD7A0', text: '#784212' },
  1: { background: '#F1948A', text: '#7B241C' },
};

const LEGEND = [
  { label: 'Excellent', ...QUALITY_COLORS[5] },
  { label: 'Good',      ...QUALITY_COLORS[4] },
  { label: 'Okay',      ...QUALITY_COLORS[3] },
  { label: 'Poor',      ...QUALITY_COLORS[2] },
  { label: 'Restless',  ...QUALITY_COLORS[1] },
];

function sleepDayColors(log: SleepLog): { background: string; text: string } {
  if (log.quality != null && QUALITY_COLORS[log.quality]) {
    return QUALITY_COLORS[log.quality];
  }
  // No quality — fall back to duration
  const h = log.sleep_hours ?? 0;
  if (h >= 7.5) return { background: '#AED6F1', text: '#1A5276' };
  if (h >= 6)   return { background: '#D6EAF8', text: '#1A5276' };
  return           { background: '#FDEBD0', text: '#784212' };
}

const TEAL = '#2C5364';
const DRUM_H = 50;

// ─── Drum picker ──────────────────────────────────────────────────────────────

function DrumPicker({ count, value, onChange, format, resetKey }: {
  count: number;
  value: number;
  onChange: (i: number) => void;
  format: (i: number) => string;
  resetKey: number;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: value * DRUM_H, animated: false });
    }, 80);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function onScrollEnd(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.y / DRUM_H);
    onChange(Math.max(0, Math.min(count - 1, idx)));
  }

  return (
    <View style={dp.container}>
      <View style={dp.highlight} pointerEvents="none" />
      <ScrollView
        ref={ref}
        snapToInterval={DRUM_H}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: DRUM_H }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        bounces={false}
      >
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={dp.item}>
            <Text style={[dp.text, i === value && dp.textSelected]}>
              {format(i)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const dp = StyleSheet.create({
  container:    { height: DRUM_H * 3, overflow: 'hidden', width: 64 },
  highlight:    { position: 'absolute', top: DRUM_H, left: 2, right: 2, height: DRUM_H, backgroundColor: '#E8F0F5', borderRadius: 10 },
  item:         { height: DRUM_H, justifyContent: 'center', alignItems: 'center' },
  text:         { fontSize: 24, fontWeight: '400', color: '#ccc' },
  textSelected: { fontSize: 26, fontWeight: '700', color: TEAL },
});

// ─── Clock picker ─────────────────────────────────────────────────────────────

function ClockPicker({ label, hour, minute, onHourChange, onMinuteChange, resetKey }: {
  label: string;
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  resetKey: number;
}) {
  const isAM = hour < 12;
  const drumHourIdx = hour % 12;

  return (
    <View style={cp.container}>
      <Text style={cp.label}>{label}</Text>
      <View style={cp.row}>
        <DrumPicker
          count={12}
          value={drumHourIdx}
          onChange={(idx) => onHourChange(isAM ? idx : idx + 12)}
          format={(i) => String(i === 0 ? 12 : i).padStart(2, '0')}
          resetKey={resetKey}
        />
        <Text style={cp.colon}>:</Text>
        <DrumPicker
          count={60}
          value={minute}
          onChange={onMinuteChange}
          format={(i) => String(i).padStart(2, '0')}
          resetKey={resetKey}
        />
        <View style={cp.ampmCol}>
          <TouchableOpacity
            style={[cp.ampmBtn, isAM && cp.ampmBtnActive]}
            onPress={() => { if (!isAM) onHourChange(hour - 12); }}
          >
            <Text style={[cp.ampmText, isAM && cp.ampmTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cp.ampmBtn, !isAM && cp.ampmBtnActive]}
            onPress={() => { if (isAM) onHourChange(hour + 12); }}
          >
            <Text style={[cp.ampmText, !isAM && cp.ampmTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const cp = StyleSheet.create({
  container:      { paddingVertical: 8 },
  label:          { fontSize: 15, fontWeight: '600', color: '#555', marginBottom: 6 },
  row:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  colon:          { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginHorizontal: 2, marginTop: -6 },
  ampmCol:        { gap: 6, marginLeft: 12 },
  ampmBtn:        { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1.5, borderColor: '#e0e0e0', minWidth: 48, alignItems: 'center' },
  ampmBtnActive:  { borderColor: TEAL, backgroundColor: '#E8F0F5' },
  ampmText:       { fontSize: 13, fontWeight: '600', color: '#ccc' },
  ampmTextActive: { color: TEAL },
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
  const now = new Date();
  const today = toDateString(now);

  const [viewedMonth, setViewedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [monthLogs, setMonthLogs] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(today);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sheetResetKey, setSheetResetKey] = useState(0);

  const [bedH, setBedH]   = useState(22);
  const [bedM, setBedM]   = useState(0);
  const [wakeH, setWakeH] = useState(6);
  const [wakeM, setWakeM] = useState(0);
  const [quality, setQuality]   = useState<number | null>(null);
  const [energy, setEnergy]     = useState<EnergyLevel | null>(null);
  const [notes, setNotes]       = useState('');

  const slideAnim = useRef(new Animated.Value(400)).current;

  const loadMonthLogs = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${daysInMonth}`;
    const data = await fetchSleepLogs(startDate, endDate);
    setMonthLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMonthLogs(viewedMonth.year, viewedMonth.month);
  }, [viewedMonth.year, viewedMonth.month, loadMonthLogs]);

  const selectedLog = monthLogs.find(l => l.log_date === selectedDate) ?? null;

  // Build calendar marked dates from this month's logs
  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    for (const log of monthLogs) {
      const colors = sleepDayColors(log);
      const isToday = log.log_date === today;
      marks[log.log_date] = {
        customStyles: {
          container: {
            backgroundColor: colors.background,
            ...(isToday && { borderWidth: 2, borderColor: colors.text, borderRadius: 16 }),
          },
          text: { color: colors.text, fontWeight: 'bold' as const },
        },
      };
    }
    // Always highlight today if not already logged
    if (!marks[today]) {
      marks[today] = {
        customStyles: {
          container: { borderWidth: 2, borderColor: TEAL, borderRadius: 16 },
          text: { color: TEAL, fontWeight: 'bold' as const },
        },
      };
    }
    return marks;
  }, [monthLogs, today]);

  function handleDayPress(day: DateData) {
    if (day.dateString > today) return; // no future logging
    setSelectedDate(day.dateString);
  }

  function openSheet() {
    const existing = monthLogs.find(l => l.log_date === selectedDate) ?? null;
    if (existing) {
      const [bh, bm] = existing.bedtime?.split(':').map(Number) ?? [22, 0];
      const [wh, wm] = existing.wake_time?.split(':').map(Number) ?? [6, 0];
      setBedH(bh); setBedM(bm); setWakeH(wh); setWakeM(wm);
      setQuality(existing.quality ?? null);
      setEnergy(existing.energy_level ?? null);
      setNotes(existing.notes ?? '');
    } else {
      setBedH(22); setBedM(0); setWakeH(6); setWakeM(0);
      setQuality(null); setEnergy(null); setNotes('');
    }
    setSheetResetKey(k => k + 1);
    setSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
  }

  function closeSheet() {
    Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true })
      .start(() => setSheetVisible(false));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const bedtime     = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;
    const wake_time   = `${String(wakeH).padStart(2, '0')}:${String(wakeM).padStart(2, '0')}`;
    const sleep_hours = calcSleepHours(bedH, bedM, wakeH, wakeM);
    const result = await saveSleepLog({
      log_date: selectedDate,
      bedtime,
      wake_time,
      sleep_hours,
      quality:      quality ?? undefined,
      energy_level: energy ?? undefined,
      notes:        notes.trim() || undefined,
    });
    setSaving(false);
    if (!result) {
      setSaveError('Could not save — check your connection and try again.');
      return;
    }
    closeSheet();
    loadMonthLogs(viewedMonth.year, viewedMonth.month);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Sleep & Energy</Text>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <Calendar
            markingType="custom"
            markedDates={markedDates}
            maxDate={today}
            onDayPress={handleDayPress}
            onMonthChange={(m: DateData) =>
              setViewedMonth({ year: m.year, month: m.month })
            }
            theme={{
              backgroundColor: '#fff',
              calendarBackground: '#fff',
              todayTextColor: TEAL,
              arrowColor: TEAL,
              monthTextColor: '#1a1a1a',
              textMonthFontWeight: '700',
            }}
          />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {LEGEND.map(item => (
            <View key={item.label} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: item.background }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected day card */}
        <Text style={styles.sectionLabel}>
          {formatDateLabel(selectedDate).toUpperCase()}
        </Text>
        <View style={styles.dayCard}>
          {loading ? (
            <Text style={styles.emptyText}>Loading…</Text>
          ) : selectedLog ? (
            <View style={styles.logSummary}>
              <View style={styles.summaryRow}>
                <Ionicons name="bed-outline" size={18} color={TEAL} />
                <Text style={styles.summaryText}>
                  {formatTime(...(selectedLog.bedtime?.split(':').map(Number) as [number, number]) ?? [22, 0])}
                  {'  →  '}
                  {formatTime(...(selectedLog.wake_time?.split(':').map(Number) as [number, number]) ?? [6, 0])}
                </Text>
                {selectedLog.sleep_hours != null && (
                  <Text style={styles.hoursChip}>{selectedLog.sleep_hours}h</Text>
                )}
              </View>
              {selectedLog.quality != null && (
                <View style={styles.summaryRow}>
                  <Ionicons name="star" size={16} color={TEAL} />
                  <Text style={styles.summaryText}>Quality {selectedLog.quality}/5</Text>
                  {selectedLog.energy_level && (
                    <Text style={styles.energyChip}>{selectedLog.energy_level}</Text>
                  )}
                </View>
              )}
              {selectedLog.notes ? (
                <Text style={styles.notesPreview} numberOfLines={2}>{selectedLog.notes}</Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>No sleep logged for this day.</Text>
          )}

          <TouchableOpacity style={styles.logBtn} onPress={openSheet}>
            <Ionicons
              name={selectedLog ? 'create-outline' : 'add-circle-outline'}
              size={18}
              color="#fff"
            />
            <Text style={styles.logBtnText}>
              {selectedLog ? 'Edit Entry' : 'Log Sleep'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Log sheet */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>
                {selectedLog ? 'Edit Sleep' : 'Log Sleep'}
                {'  '}
                <Text style={styles.sheetDate}>{formatDateLabel(selectedDate)}</Text>
              </Text>

              <View style={styles.sheetSection}>
                <ClockPicker
                  label="Bedtime"
                  hour={bedH} minute={bedM}
                  onHourChange={setBedH}
                  onMinuteChange={setBedM}
                  resetKey={sheetResetKey}
                />
                <View style={styles.divider} />
                <ClockPicker
                  label="Wake time"
                  hour={wakeH} minute={wakeM}
                  onHourChange={setWakeH}
                  onMinuteChange={setWakeM}
                  resetKey={sheetResetKey}
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
                      style={[
                        styles.numberBtn,
                        quality === n && { backgroundColor: QUALITY_COLORS[n].background, borderColor: QUALITY_COLORS[n].background },
                      ]}
                      onPress={() => setQuality(quality === n ? null : n)}
                    >
                      <Text style={[
                        styles.numberBtnText,
                        quality === n && { color: QUALITY_COLORS[n].text },
                      ]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.scaleHint}>1 = Restless  ·  5 = Excellent</Text>
              </View>

              <Text style={styles.fieldLabel}>Morning Energy</Text>
              <View style={styles.sheetSection}>
                <View style={styles.chipRow}>
                  {ENERGY_OPTIONS.map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, energy === key && styles.chipSelected]}
                      onPress={() => setEnergy(energy === key ? null : key)}
                    >
                      <Text style={[styles.chipText, energy === key && styles.chipTextSelected]}>
                        {label}
                      </Text>
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

              {saveError && (
                <Text style={styles.saveError}>{saveError}</Text>
              )}

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
  container:    { flex: 1, backgroundColor: '#f8f8f8' },
  scroll:       { paddingBottom: 40 },
  heading:      { fontSize: 28, fontWeight: '700', color: '#1a1a1a', margin: 16, marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },

  calendarCard: { backgroundColor: '#fff', marginHorizontal: 0 },

  legend:       { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  legendItem:   { alignItems: 'center', gap: 4 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendLabel:  { fontSize: 10, color: '#888', fontWeight: '500' },

  dayCard:      { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, padding: 16, gap: 14 },
  emptyText:    { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 4 },
  logSummary:   { gap: 8 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText:  { fontSize: 15, color: '#1a1a1a', flex: 1 },
  hoursChip:    { backgroundColor: '#E8F0F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 13, fontWeight: '600', color: TEAL },
  energyChip:   { backgroundColor: '#E8F0F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 13, color: TEAL, textTransform: 'capitalize' },
  notesPreview: { fontSize: 13, color: '#888', fontStyle: 'italic', lineHeight: 18 },
  logBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: TEAL, borderRadius: 10, paddingVertical: 12 },
  logBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Sheet
  overlay:        { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40, maxHeight: '92%' },
  handle:         { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  sheetTitle:     { fontSize: 20, fontWeight: '700', color: '#1a1a1a', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 },
  sheetDate:      { fontSize: 15, fontWeight: '400', color: '#888' },
  sheetSection:   { backgroundColor: '#f8f8f8', borderRadius: 12, marginHorizontal: 16, marginBottom: 4, padding: 14 },
  divider:        { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  sleepHoursNote: { fontSize: 13, color: TEAL, fontWeight: '600', textAlign: 'center', marginTop: 10 },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: '#555', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  optionRow:      { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  numberBtn:      { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center' },
  numberBtnText:  { fontSize: 16, fontWeight: '700', color: '#666' },
  scaleHint:      { fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 8 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa' },
  chipSelected:   { borderColor: TEAL, backgroundColor: '#E8F0F5' },
  chipText:       { fontSize: 14, color: '#555' },
  chipTextSelected: { color: TEAL, fontWeight: '600' },
  textArea:       { fontSize: 15, color: '#1a1a1a', minHeight: 80 },
  saveError:      { marginHorizontal: 16, marginTop: 8, fontSize: 13, color: '#c0392b', textAlign: 'center' },
  saveBtn:        { margin: 16, backgroundColor: TEAL, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:    { color: '#fff', fontWeight: '700', fontSize: 16 },
});
