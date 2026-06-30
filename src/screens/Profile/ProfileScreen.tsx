import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { fetchOnboardingProfile, authSignOut } from '../../services/supabase';
import { useCycle } from '../../contexts/CycleContext';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCyclePhase } from '../../utils/cycleCalculator';
import { ProfileStackParamList } from '../../types';

type Nav = StackNavigationProp<ProfileStackParamList>;

function Row({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );
}

const PHASE_LABELS: Record<string, string> = {
  menstrual: 'Menstrual', follicular: 'Follicular', ovulatory: 'Ovulatory', luteal: 'Luteal',
};
const PHASE_COLORS: Record<string, string> = {
  menstrual: '#E74C3C', follicular: '#27AE60', ovulatory: '#F39C12', luteal: '#9B59B6',
};

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { lastPeriodDate, cycleLength, periodLength, isDefaultData } = useCycle();
  const { user, isAnonymous, loading: authLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetchOnboardingProfile().then(p => setOnboardingDone(!!p));
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await authSignOut();
    setSigningOut(false);
  }

  const phase = !isDefaultData ? (() => {
    try { return calculateCyclePhase({ lastPeriodDate, cycleLength, periodLength }); }
    catch { return null; }
  })() : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Text style={styles.heading}>Profile</Text>

        {/* Cycle summary card */}
        {phase ? (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={[styles.phaseDot, { backgroundColor: PHASE_COLORS[phase.phase] }]} />
              <Text style={styles.summaryPhase}>{PHASE_LABELS[phase.phase]} Phase</Text>
              <Text style={styles.summaryDay}>Day {phase.dayOfCycle}</Text>
            </View>
            <Text style={styles.summaryNext}>
              Next period: {phase.nextPeriodDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        ) : (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEmpty}>Set your cycle dates to see your phase summary.</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>MY CYCLE</Text>
        <View style={styles.card}>
          <Row
            title="Cycle Settings"
            subtitle="Last period, cycle & period length"
            onPress={() => navigation.navigate('CycleSettings')}
          />
          <Row
            title="Health Questionnaire"
            subtitle={onboardingDone ? 'Completed' : 'Not completed yet'}
            onPress={() => navigation.navigate('Onboarding')}
          />
        </View>

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>
          <Row
            title="Notifications"
            subtitle="Pill reminders, period alerts, phase transitions"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          {authLoading ? (
            <View style={styles.row}>
              <Text style={styles.rowSub}>Loading…</Text>
            </View>
          ) : isAnonymous ? (
            <>
              <Row
                title="Create Account"
                subtitle="Save your data and sync across devices"
                onPress={() => navigation.navigate('Auth')}
              />
              <Row
                title="Sign In"
                subtitle="Already have an account?"
                onPress={() => navigation.navigate('Auth')}
              />
            </>
          ) : (
            <>
              <View style={[styles.row, { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }]}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>Signed in</Text>
                  <Text style={styles.rowSub}>{user?.email}</Text>
                </View>
                <Ionicons name="person-circle-outline" size={22} color="#8B3A5A" />
              </View>
              <TouchableOpacity
                style={styles.row}
                onPress={handleSignOut}
                disabled={signingOut}
              >
                <Text style={[styles.rowTitle, { color: '#C0392B' }]}>
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  heading: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16, marginBottom: 20, padding: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  summaryPhase: { fontSize: 17, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  summaryDay: { fontSize: 14, fontWeight: '600', color: '#666' },
  summaryNext: { fontSize: 13, color: '#888' },
  summaryEmpty: { fontSize: 14, color: '#aaa', textAlign: 'center', paddingVertical: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#aaa', paddingHorizontal: 16, paddingBottom: 6, letterSpacing: 0.8 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  rowSub: { fontSize: 13, color: '#888', marginTop: 2 },
});
