import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { fetchOnboardingProfile } from '../../services/supabase';
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

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    fetchOnboardingProfile().then(p => setOnboardingDone(!!p));
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Text style={styles.heading}>Profile</Text>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  heading: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#aaa', paddingHorizontal: 16, paddingBottom: 6, letterSpacing: 0.8 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  rowSub: { fontSize: 13, color: '#888', marginTop: 2 },
});
