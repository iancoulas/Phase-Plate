import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { saveConsentAcceptance } from '../../services/supabase';
import { GENERAL_TERMS_TEXT, CONFIDENTIALITY_TEXT } from './legalText';

const ROSE = '#8B3A5A';
const SCROLL_END_THRESHOLD_PX = 24;

interface Props {
  onAccept: () => void;
}

function Checkbox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.checkboxRow} onPress={onToggle} activeOpacity={0.7}>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={24}
        color={checked ? ROSE : '#999'}
      />
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ConsentScreen({ onAccept }: Props) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [generalTermsChecked, setGeneralTermsChecked] = useState(false);
  const [confidentialityChecked, setConfidentialityChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const canAccept = hasScrolledToEnd && generalTermsChecked && confidentialityChecked && !saving;

  // If the text fits on screen without scrolling (large tablet, big screen), there's
  // nothing to scroll and onScroll would never fire — treat it as already read.
  useEffect(() => {
    if (viewportHeight > 0 && contentHeight > 0 && contentHeight <= viewportHeight + SCROLL_END_THRESHOLD_PX) {
      setHasScrolledToEnd(true);
    }
  }, [viewportHeight, contentHeight]);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (hasScrolledToEnd) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const reachedEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_END_THRESHOLD_PX;
    if (reachedEnd) setHasScrolledToEnd(true);
  }

  async function handleAccept() {
    if (!canAccept) return;
    setSaving(true);
    const ok = await saveConsentAcceptance();
    setSaving(false);
    if (ok) onAccept();
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.heading}>Before You Continue</Text>
      <Text style={styles.subheading}>
        Please read the following and scroll to the bottom to continue.
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        onLayout={e => setViewportHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_w, h) => setContentHeight(h)}
      >
        <Text style={styles.legalText}>{GENERAL_TERMS_TEXT}</Text>
        <View style={styles.divider} />
        <Text style={styles.legalText}>{CONFIDENTIALITY_TEXT}</Text>
        <View style={{ height: 4 }} />
      </ScrollView>

      {!hasScrolledToEnd && (
        <View style={styles.scrollHint}>
          <Ionicons name="arrow-down-circle-outline" size={16} color="#888" />
          <Text style={styles.scrollHintText}>Scroll to the bottom to continue</Text>
        </View>
      )}

      <View style={styles.checkboxes}>
        <Checkbox
          checked={generalTermsChecked}
          label="I have read and agree to the General Terms of Service"
          onToggle={() => setGeneralTermsChecked(v => !v)}
        />
        <Checkbox
          checked={confidentialityChecked}
          label="I understand and agree to the Confidentiality Notice"
          onToggle={() => setConfidentialityChecked(v => !v)}
        />
      </View>

      <TouchableOpacity
        style={[styles.acceptBtn, !canAccept && styles.acceptBtnDisabled]}
        onPress={handleAccept}
        disabled={!canAccept}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.acceptBtnText}>Accept & Continue</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 20 },
  heading: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  subheading: { fontSize: 13, color: '#888', marginTop: 4, marginBottom: 12 },
  scroll: { flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 12 },
  scrollContent: { padding: 16 },
  legalText: { fontSize: 13, lineHeight: 20, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
  scrollHint: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 10 },
  scrollHintText: { fontSize: 12, color: '#888' },
  checkboxes: { marginTop: 8, gap: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkboxLabel: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  acceptBtn: { backgroundColor: ROSE, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 12, marginBottom: 12 },
  acceptBtnDisabled: { opacity: 0.4 },
  acceptBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
