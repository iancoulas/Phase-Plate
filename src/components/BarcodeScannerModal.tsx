import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { fetchProductByBarcode, scalePer100g, NutritionData } from '../services/openFoodFacts';
import { saveFoodLog, FoodLog } from '../services/supabase';

type Stage = 'scanning' | 'looking_up' | 'found' | 'not_found' | 'manual';

interface Props {
  visible: boolean;
  onClose: () => void;
  onLogged: (log: FoodLog) => void;
  initialStage?: Stage;
}

export default function BarcodeScannerModal({ visible, onClose, onLogged, initialStage = 'scanning' }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>(initialStage);
  const [product, setProduct] = useState<NutritionData | null>(null);
  const [serving, setServing] = useState('100');
  const [manual, setManual] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });
  const [saving, setSaving] = useState(false);
  const lastScanRef = useRef<string | null>(null);
  const sweepAnim = useRef(new Animated.Value(0)).current;

  // Reset to the correct initial stage each time the modal opens
  React.useEffect(() => {
    if (visible) setStage(initialStage);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (visible && stage === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(sweepAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(sweepAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => sweepAnim.stopAnimation();
  }, [visible, stage, sweepAnim]);

  function reset() {
    lastScanRef.current = null;
    setStage(initialStage);
    setProduct(null);
    setServing('100');
    setManual({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });
  }

  async function handleBarcode(result: BarcodeScanningResult) {
    if (lastScanRef.current === result.data) return;
    lastScanRef.current = result.data;
    setStage('looking_up');

    const lookup = await fetchProductByBarcode(result.data);
    if (lookup.status === 'found') {
      setProduct(lookup.data);
      setServing('100');
      setStage('found');
    } else if (lookup.status === 'not_found') {
      setStage('not_found');
    } else {
      setStage('not_found');
    }
  }

  async function saveFound() {
    if (!product) return;
    setSaving(true);
    const grams = parseFloat(serving) || 100;
    const scaled = scalePer100g(product.per100g, grams);
    const log = await saveFoodLog({
      log_date: new Date().toISOString().split('T')[0],
      meal_name: `${product.name}${product.brand ? ` (${product.brand})` : ''}`,
      calories: scaled.calories,
      protein_g: scaled.protein,
      carbs_g: scaled.carbs,
      fat_g: scaled.fat,
      fiber_g: scaled.fiber,
    });
    setSaving(false);
    if (log) onLogged(log);
    onClose();
    reset();
  }

  async function saveManual() {
    setSaving(true);
    const log = await saveFoodLog({
      log_date: new Date().toISOString().split('T')[0],
      meal_name: manual.name || 'Manual entry',
      calories: manual.calories ? parseFloat(manual.calories) : undefined,
      protein_g: manual.protein ? parseFloat(manual.protein) : undefined,
      carbs_g: manual.carbs ? parseFloat(manual.carbs) : undefined,
      fat_g: manual.fat ? parseFloat(manual.fat) : undefined,
      fiber_g: manual.fiber ? parseFloat(manual.fiber) : undefined,
    });
    setSaving(false);
    if (log) onLogged(log);
    onClose();
    reset();
  }

  function renderContent() {
    if (!permission?.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.message}>Camera permission required</Text>
          <TouchableOpacity style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stage === 'scanning') {
      const sweepY = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });
      return (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'upc_a', 'ean8', 'upc_e'] }}
          onBarcodeScanned={handleBarcode}
        >
          <View style={styles.scanOverlay}>
            <View style={styles.viewfinder}>
              <Animated.View style={[styles.sweepLine, { transform: [{ translateY: sweepY }] }]} />
            </View>
            <Text style={styles.scanHint}>Point camera at a barcode</Text>
            <TouchableOpacity style={styles.manualBtn} onPress={() => setStage('manual')}>
              <Text style={styles.manualBtnText}>Enter manually</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      );
    }

    if (stage === 'looking_up') {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#9B59B6" />
          <Text style={styles.message}>Looking up product…</Text>
        </View>
      );
    }

    if (stage === 'found' && product) {
      const grams = parseFloat(serving) || 100;
      const scaled = scalePer100g(product.per100g, grams);
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
          <Text style={styles.productName}>{product.name}</Text>
          {!!product.brand && <Text style={styles.brand}>{product.brand}</Text>}
          <View style={styles.row}>
            <Text style={styles.label}>Serving (g)</Text>
            <TextInput
              style={styles.servingInput}
              value={serving}
              onChangeText={setServing}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.macroRow}>
            {[
              { label: 'Cal', value: scaled.calories },
              { label: 'Protein', value: `${scaled.protein}g` },
              { label: 'Carbs', value: `${scaled.carbs}g` },
              { label: 'Fat', value: `${scaled.fat}g` },
              { label: 'Fiber', value: `${scaled.fiber}g` },
            ].map(m => (
              <View key={m.label} style={styles.macroTile}>
                <Text style={styles.macroValue}>{m.value}</Text>
                <Text style={styles.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={saveFound} disabled={saving}>
            <Text style={styles.btnText}>{saving ? 'Saving…' : 'Log this meal'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={reset}><Text style={styles.link}>Scan again</Text></TouchableOpacity>
        </KeyboardAvoidingView>
      );
    }

    if (stage === 'not_found') {
      return (
        <View style={styles.center}>
          <Text style={styles.message}>Product not found</Text>
          <TouchableOpacity style={styles.btn} onPress={reset}><Text style={styles.btnText}>Scan again</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setStage('manual')}><Text style={styles.link}>Enter manually</Text></TouchableOpacity>
        </View>
      );
    }

    // manual stage
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <Text style={styles.sheetTitle}>Manual entry</Text>
        {(['name', 'calories', 'protein', 'carbs', 'fat', 'fiber'] as const).map(field => (
          <TextInput
            key={field}
            style={styles.input}
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={manual[field]}
            onChangeText={v => setManual(m => ({ ...m, [field]: v }))}
            keyboardType={field === 'name' ? 'default' : 'numeric'}
          />
        ))}
        <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={saveManual} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Log meal'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => { reset(); onClose(); }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', gap: 16 },
  scanOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder: { width: 250, height: 200, borderWidth: 2, borderColor: '#fff', overflow: 'hidden', borderRadius: 8 },
  sweepLine: { height: 2, backgroundColor: '#9B59B6', width: '100%' },
  scanHint: { color: '#fff', marginTop: 16, fontSize: 14 },
  message: { fontSize: 16, color: '#333', textAlign: 'center', paddingHorizontal: 24 },
  sheet: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  productName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  brand: { fontSize: 14, color: '#666', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  label: { fontSize: 15, color: '#333' },
  servingInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 80, textAlign: 'center', fontSize: 16 },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  macroTile: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8, alignItems: 'center' },
  macroValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  macroLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, fontSize: 15 },
  btn: { backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  manualBtn: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  manualBtnText: { color: '#fff', fontSize: 14 },
  link: { color: '#9B59B6', fontSize: 14, textAlign: 'center', marginTop: 4 },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  closeText: { color: '#fff', fontSize: 16 },
});
