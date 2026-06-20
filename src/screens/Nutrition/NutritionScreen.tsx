import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { saveFoodLog, fetchFoodLogsForDate, FoodLog } from '../../services/supabase';
import { useCycle } from '../../contexts/CycleContext';
import { calculateCyclePhase } from '../../utils/cycleCalculator';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

interface AnalysedFood {
  meal_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  iron_mg: number;
  confidence: 'high' | 'medium' | 'low';
}

function PulsingLoader() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return (
    <View style={styles.loaderContainer}>
      <Animated.Text style={[styles.loaderIcon, { transform: [{ scale }] }]}>🍽️</Animated.Text>
      <Text style={styles.loaderText}>Analysing your meal…</Text>
    </View>
  );
}

async function analysePhoto(base64: string): Promise<AnalysedFood> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a nutrition expert. Analyse this food photo and return ONLY valid JSON with these fields: meal_name (string), calories (integer), protein_g (number), carbs_g (number), fat_g (number), fiber_g (number), iron_mg (number), confidence ("high"|"medium"|"low"). Estimate for a single serving. No markdown, no extra text.`,
            },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'low' } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const content: string = json.choices[0].message.content.trim();
  const cleaned = content.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(cleaned) as AnalysedFood;
}

export default function NutritionScreen() {
  const today = new Date().toISOString().split('T')[0];
  const { lastPeriodDate, cycleLength, periodLength, isDefaultData } = useCycle();
  const phaseHint = !isDefaultData ? (() => {
    try {
      const result = calculateCyclePhase({ lastPeriodDate, cycleLength, periodLength });
      return { phase: result.phase, tip: result.nutritionTips[0] };
    } catch { return null; }
  })() : null;
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [analysing, setAnalysing] = useState(false);
  const [analysed, setAnalysed] = useState<AnalysedFood | null>(null);
  const [editCard, setEditCard] = useState<AnalysedFood | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [logsLoading, setLogsLoading] = useState(true);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    setError(null);
    try {
      const data = await fetchFoodLogsForDate(today);
      setLogs(data);
    } catch {
      setError('Could not load your meals. Tap to retry.');
    } finally {
      setLogsLoading(false);
    }
  }, [today]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const openCamera = useCallback(async () => {
    setError(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { setError('Camera permission required'); return; }

    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (result.canceled || !result.assets[0].base64) return;

    setAnalysing(true);
    try {
      const food = await analysePhoto(result.assets[0].base64);
      setAnalysed(food);
      setEditCard(food);
    } catch (err) {
      setError(String(err));
    } finally {
      setAnalysing(false);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!editCard) return;
    setSaving(true);
    const log = await saveFoodLog({ ...editCard, log_date: today });
    setSaving(false);
    if (log) {
      setLogs(prev => [log, ...prev]);
      setEditCard(null);
      setAnalysed(null);
    } else {
      setError('Failed to save meal. Please try again.');
      setEditCard(null);
    }
  }, [editCard, today]);

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      protein:  acc.protein  + (l.protein_g ?? 0),
      carbs:    acc.carbs    + (l.carbs_g ?? 0),
      fat:      acc.fat      + (l.fat_g ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Today's Plate</Text>
      <Text style={styles.subheading}>{today}</Text>

      {error && (
        <TouchableOpacity onPress={loadLogs}>
          <Text style={styles.errorText}>{error}</Text>
        </TouchableOpacity>
      )}

      {/* Phase-aware nutrition hint */}
      {phaseHint && (
        <View style={styles.hintBanner}>
          <Text style={styles.hintPhase}>{phaseHint.phase.charAt(0).toUpperCase() + phaseHint.phase.slice(1)} phase</Text>
          <Text style={styles.hintTip}>{phaseHint.tip}</Text>
        </View>
      )}

      {/* Daily nutrition summary */}
      <View style={styles.totalCard}>
        <View style={styles.totalCalRow}>
          <Text style={styles.totalLabel}>Calories</Text>
          <Text style={styles.totalValue}>{Math.round(totals.calories)}</Text>
        </View>
        <View style={styles.macroRow}>
          {([
            { label: 'Protein', value: totals.protein, color: '#E74C3C' },
            { label: 'Carbs',   value: totals.carbs,   color: '#F39C12' },
            { label: 'Fat',     value: totals.fat,     color: '#2ECC71' },
          ] as const).map(m => (
            <View key={m.label} style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {analysing && <PulsingLoader />}

      {/* Edit card */}
      {editCard && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setEditCard(null)}>
          <View style={styles.editOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.editSheet}>
              <Text style={styles.editTitle}>Confirm Meal</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: editCard.confidence === 'high' ? '#2ECC71' : editCard.confidence === 'medium' ? '#F1C40F' : '#E74C3C' }]}>
                <Text style={styles.confidenceText}>{editCard.confidence} confidence</Text>
              </View>
              {(['meal_name', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'iron_mg'] as const).map(field => (
                <View key={field} style={styles.editRow}>
                  <Text style={styles.editLabel}>{field.replace(/_/g, ' ')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={String(editCard[field])}
                    onChangeText={v => setEditCard(c => c ? { ...c, [field]: field === 'meal_name' ? v : parseFloat(v) || 0 } : null)}
                    keyboardType={field === 'meal_name' ? 'default' : 'numeric'}
                  />
                </View>
              ))}
              <TouchableOpacity style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]} onPress={handleConfirm} disabled={saving}>
                <Text style={styles.confirmBtnText}>{saving ? 'Saving…' : 'Confirm & Save'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditCard(null)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      )}

      {/* Log list */}
      <FlatList
        data={logs}
        keyExtractor={item => item.id ?? Math.random().toString()}
        renderItem={({ item }) => (
          <View style={styles.logRow}>
            <View style={styles.logInfo}>
              <Text style={styles.logName}>{item.meal_name}</Text>
              <Text style={styles.logMacros}>
                P: {item.protein_g ?? 0}g · C: {item.carbs_g ?? 0}g · F: {item.fat_g ?? 0}g
              </Text>
            </View>
            <Text style={styles.logCal}>{item.calories ?? 0} cal</Text>
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No meals logged yet today.</Text>}
      />

      {/* FABs */}
      <View style={styles.fabRow}>
        <TouchableOpacity style={styles.fabSecondary} onPress={() => setScannerVisible(true)}>
          <Ionicons name="barcode-outline" size={24} color="#9B59B6" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={openCamera}>
          <Ionicons name="camera" size={26} color="#fff" />
          <Text style={styles.fabText}>Log Meal</Text>
        </TouchableOpacity>
      </View>

      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onLogged={log => setLogs(prev => [log, ...prev])}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  heading: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8 },
  subheading: { fontSize: 14, color: '#888', paddingHorizontal: 16, marginBottom: 12 },
  totalCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  totalCalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalLabel: { fontSize: 15, color: '#666' },
  totalValue: { fontSize: 28, fontWeight: '700', color: '#E74C3C' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12 },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 17, fontWeight: '700' },
  macroLabel: { fontSize: 11, color: '#aaa', fontWeight: '500' },
  errorText: { color: '#E74C3C', paddingHorizontal: 16, marginBottom: 8, fontSize: 13 },
  hintBanner: { marginHorizontal: 16, marginBottom: 10, backgroundColor: '#EDE7F6', borderRadius: 10, padding: 12 },
  hintPhase: { fontSize: 12, fontWeight: '700', color: '#6C3483', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  hintTip: { fontSize: 13, color: '#4A235A', lineHeight: 18 },
  loaderContainer: { alignItems: 'center', paddingVertical: 24 },
  loaderIcon: { fontSize: 48 },
  loaderText: { marginTop: 12, fontSize: 15, color: '#666' },
  editOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  editSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, maxHeight: '85%' },
  editTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  confidenceBadge: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 16 },
  confidenceText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  editRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  editLabel: { fontSize: 14, color: '#666', textTransform: 'capitalize' },
  editInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 120, textAlign: 'right', fontSize: 15 },
  confirmBtn: { backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16, marginBottom: 12 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#666', fontSize: 14 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  logInfo: { flex: 1 },
  logName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  logMacros: { fontSize: 12, color: '#888', marginTop: 2 },
  logCal: { fontSize: 16, fontWeight: '700', color: '#E74C3C' },
  emptyText: { textAlign: 'center', color: '#aaa', paddingTop: 32, fontSize: 14 },
  fabRow: { position: 'absolute', bottom: 24, right: 20, alignItems: 'flex-end', gap: 12 },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#9B59B6', borderRadius: 28, paddingHorizontal: 20, paddingVertical: 14 },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  fabSecondary: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', borderWidth: 1, borderColor: '#9B59B6', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
});
