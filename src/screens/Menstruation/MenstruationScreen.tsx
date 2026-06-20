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

import { useNavigation } from '@react-navigation/native';
import { calculateCyclePhase, CyclePhase } from '../../utils/cycleCalculator';
import { generateMarkedDates, PHASE_COLORS } from '../../utils/cycleCalendar';
import { saveLog, fetchLogsForMonth, MenstruationLog, FlowLevel, Mood } from '../../services/supabase';
import { useCycle } from '../../contexts/CycleContext';

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Ovulatory',
  luteal: 'Luteal',
};

const MOOD_OPTIONS: { value: Mood; emoji: string }[] = [
  { value: 'great', emoji: '😄' },
  { value: 'good', emoji: '🙂' },
  { value: 'okay', emoji: '😐' },
  { value: 'bad', emoji: '😕' },
  { value: 'terrible', emoji: '😞' },
];

const FLOW_OPTIONS: { value: FlowLevel; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
  { value: 'very_heavy', label: 'Very Heavy' },
];

export default function MenstruationScreen() {
  const navigation = useNavigation<any>();
  const { lastPeriodDate, cycleLength, periodLength, isDefaultData } = useCycle();
  const now = new Date();
  const [viewedMonth, setViewedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [crampLevel, setCrampLevel] = useState<number>(1);
  const [mood, setMood] = useState<Mood>('okay');
  const [flowLevel, setFlowLevel] = useState<FlowLevel>('medium');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [monthLogs, setMonthLogs] = useState<MenstruationLog[]>([]);
  const slideAnim = useRef(new Animated.Value(300)).current;

  const cycleParams = { lastPeriodDate, cycleLength, periodLength };

  const loadMonthLogs = useCallback(async (year: number, month: number) => {
    try {
      const logs = await fetchLogsForMonth(year, month);
      setMonthLogs(logs);
    } catch (err) {
      console.warn('[MenstruationScreen] fetchLogsForMonth error:', err);
    }
  }, []);

  useEffect(() => {
    loadMonthLogs(viewedMonth.year, viewedMonth.month);
  }, [viewedMonth.year, viewedMonth.month, loadMonthLogs]);

  const currentPhase = useMemo(() => {
    try {
      return calculateCyclePhase(cycleParams);
    } catch {
      return null;
    }
  }, [lastPeriodDate, cycleLength, periodLength]);

  const markedDates = useMemo(() => {
    const base = generateMarkedDates(viewedMonth.year, viewedMonth.month, cycleParams);
    // Overlay actual logged period days as red dots
    for (const log of monthLogs) {
      if (log.flow_level && log.flow_level !== 'none') {
        const existing = base[log.log_date] ?? {};
        base[log.log_date] = {
          ...existing,
          marked: true,
          dots: [{ key: 'logged', color: '#E74C3C' }],
        };
      }
    }
    return base;
  }, [viewedMonth.year, viewedMonth.month, lastPeriodDate, cycleLength, periodLength, monthLogs]);

  const openSheet = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    setCrampLevel(1);
    setMood('okay');
    setFlowLevel('medium');
    setNotes('');
    setSaved(false);
    setSheetVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
  }, [slideAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
    });
  }, [slideAnim]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveLog({ log_date: selectedDate, cramp_level: crampLevel, mood, flow_level: flowLevel, notes });
      setSaved(true);
      await loadMonthLogs(viewedMonth.year, viewedMonth.month);
      setTimeout(() => closeSheet(), 800);
    } catch (err) {
      console.warn('[MenstruationScreen] save error:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedDate, crampLevel, mood, flowLevel, notes, closeSheet, loadMonthLogs, viewedMonth]);

  const phaseColors = currentPhase ? PHASE_COLORS[currentPhase.phase] : PHASE_COLORS.follicular;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        {/* Phase Card — only shown when we have real cycle data */}
        {currentPhase && !isDefaultData && (
          <View style={[styles.phaseCard, { backgroundColor: phaseColors.background }]}>
            <View style={styles.phaseHeader}>
              <Text style={[styles.phaseName, { color: phaseColors.text }]}>
                {PHASE_LABELS[currentPhase.phase]} Phase
              </Text>
              <View style={[styles.dayBadge, { backgroundColor: phaseColors.swatch }]}>
                <Text style={styles.dayBadgeText}>Day {currentPhase.dayOfCycle}</Text>
              </View>
            </View>
            <Text style={[styles.phaseDescription, { color: phaseColors.text }]}>
              {currentPhase.description}
            </Text>
            <Text style={[styles.countdown, { color: phaseColors.text }]}>
              {currentPhase.daysUntilNextPhase === 0
                ? 'Last day of this phase'
                : `${currentPhase.daysUntilNextPhase} day${currentPhase.daysUntilNextPhase !== 1 ? 's' : ''} until next phase`}
            </Text>
          </View>
        )}

        {/* First-run setup prompt */}
        {isDefaultData && (
          <TouchableOpacity
            style={styles.setupBanner}
            onPress={() => navigation.navigate('Profile', { screen: 'CycleSettings' })}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color="#8B3A5A" />
            <Text style={styles.setupBannerText}>Set your last period date for accurate phase predictions</Text>
            <Ionicons name="chevron-forward" size={16} color="#8B3A5A" />
          </TouchableOpacity>
        )}

        {/* Phase Legend */}
        <View style={styles.legend}>
          {(Object.keys(PHASE_COLORS) as CyclePhase[]).map(phase => (
            <View key={phase} style={styles.legendItem}>
              <View style={[styles.swatch, { backgroundColor: PHASE_COLORS[phase].swatch }]} />
              <Text style={styles.legendLabel}>{PHASE_LABELS[phase]}</Text>
            </View>
          ))}
        </View>

        {/* Calendar */}
        <Calendar
          markingType="custom"
          markedDates={markedDates}
          onDayPress={(day: DateData) => openSheet(day.dateString)}
          onMonthChange={(month: DateData) => setViewedMonth({ year: month.year, month: month.month })}
          theme={{
            backgroundColor: '#fff',
            calendarBackground: '#fff',
            todayTextColor: '#9B59B6',
            arrowColor: '#9B59B6',
          }}
        />

        <TouchableOpacity style={styles.logTodayBtn} onPress={() => openSheet(now.toISOString().split('T')[0])}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.logTodayText}>Log Today</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Log Sheet Modal */}
      <Modal visible={sheetVisible} transparent animationType="none" onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log — {selectedDate}</Text>

            {/* Cramp level */}
            <Text style={styles.fieldLabel}>Cramp Level</Text>
            <View style={styles.optionRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.numberBtn, crampLevel === n && styles.numberBtnSelected]}
                  onPress={() => setCrampLevel(n)}
                >
                  <Text style={[styles.numberBtnText, crampLevel === n && styles.numberBtnTextSelected]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Mood */}
            <Text style={styles.fieldLabel}>Mood</Text>
            <View style={styles.optionRow}>
              {MOOD_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.moodBtn, mood === o.value && styles.moodBtnSelected]}
                  onPress={() => setMood(o.value)}
                >
                  <Text style={styles.moodEmoji}>{o.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Flow */}
            <Text style={styles.fieldLabel}>Flow Level</Text>
            <View style={styles.optionRow}>
              {FLOW_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.flowBtn, flowLevel === o.value && styles.flowBtnSelected]}
                  onPress={() => setFlowLevel(o.value)}
                >
                  <Text style={[styles.flowBtnText, flowLevel === o.value && styles.flowBtnTextSelected]}>
                    {o.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How are you feeling?"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.saveBtn, (saving || saved) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || saved}
            >
              <Text style={styles.saveBtnText}>{saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  setupBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: '#FDF0F4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDD5DF' },
  setupBannerText: { flex: 1, fontSize: 13, color: '#8B3A5A', fontWeight: '500' },
  phaseCard: { margin: 16, borderRadius: 16, padding: 20 },
  phaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  phaseName: { fontSize: 22, fontWeight: '700' },
  dayBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  dayBadgeText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  phaseDescription: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  countdown: { fontSize: 13, fontWeight: '500' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, paddingBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: '#666' },
  logTodayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14 },
  logTodayText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, minHeight: 400 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  numberBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  numberBtnSelected: { backgroundColor: '#9B59B6', borderColor: '#9B59B6' },
  numberBtnText: { fontSize: 16, color: '#666' },
  numberBtnTextSelected: { color: '#fff', fontWeight: '600' },
  moodBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  moodBtnSelected: { borderColor: '#9B59B6', backgroundColor: '#EDE7F6' },
  moodEmoji: { fontSize: 22 },
  flowBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd' },
  flowBtnSelected: { backgroundColor: '#9B59B6', borderColor: '#9B59B6' },
  flowBtnText: { fontSize: 13, color: '#666' },
  flowBtnTextSelected: { color: '#fff', fontWeight: '600' },
  notesInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginTop: 4 },
  saveBtn: { backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
