import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { HealthStats } from '../services/healthKitService';

interface Props {
  stats: HealthStats | null;
  loading: boolean;
  onConnect: () => void;
  onRefresh: () => void;
}

const STEP_GOAL = 10000;
const RING_RADIUS = 54;
const RING_STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function StepRing({ steps }: { steps: number | null }) {
  const progress = steps != null ? Math.min(steps / STEP_GOAL, 1) : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.ringContainer}>
      <Svg width={128} height={128} viewBox="0 0 128 128">
        <Defs>
          <LinearGradient id="rose" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#E74C3C" />
            <Stop offset="100%" stopColor="#9B59B6" />
          </LinearGradient>
        </Defs>
        <Circle cx={64} cy={64} r={RING_RADIUS} stroke="#f0f0f0" strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={64} cy={64} r={RING_RADIUS}
          stroke="url(#rose)"
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform="rotate(-90 64 64)"
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={styles.stepsValue}>{steps != null ? steps.toLocaleString() : '—'}</Text>
        <Text style={styles.stepsLabel}>steps</Text>
      </View>
    </View>
  );
}

function relativeTime(date: Date | null): string {
  if (!date) return '';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export default function TodayStatsCard({ stats, loading, onConnect, onRefresh }: Props) {
  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>Loading health data…</Text>
      </View>
    );
  }

  if (!stats?.permissionsGranted) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Today's Activity</Text>
        <Text style={styles.subtitle}>Connect to see your steps, calories, and heart rate.</Text>
        <TouchableOpacity style={styles.connectBtn} onPress={onConnect}>
          <Text style={styles.connectBtnText}>
            Connect {require('react-native').Platform.OS === 'ios' ? 'Apple Health' : 'Google Fit'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Activity</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.refreshBtn}>↺</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <StepRing steps={stats.steps} />

        <View style={styles.tiles}>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>{stats.activeCalories != null ? Math.round(stats.activeCalories) : '—'}</Text>
            <Text style={styles.tileLabel}>Active cal</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileValue}>{stats.restingHR != null ? Math.round(stats.restingHR) : '—'}</Text>
            <Text style={styles.tileLabel}>Resting HR</Text>
          </View>
        </View>
      </View>

      {stats.lastWorkout && (
        <View style={styles.workoutRow}>
          <Text style={styles.workoutName}>{stats.lastWorkout.name}</Text>
          <Text style={styles.workoutMeta}>
            {Math.round(stats.lastWorkout.duration / 60)} min · {relativeTime(stats.lastWorkout.date)}
          </Text>
        </View>
      )}

      {stats.lastSyncedAt && (
        <Text style={styles.syncTime}>Synced {relativeTime(stats.lastSyncedAt)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, margin: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  refreshBtn: { fontSize: 22, color: '#9B59B6' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringContainer: { width: 128, height: 128, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  stepsValue: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  stepsLabel: { fontSize: 11, color: '#666' },
  tiles: { flex: 1, gap: 12 },
  tile: { backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12 },
  tileValue: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  tileLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  workoutRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  workoutName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  workoutMeta: { fontSize: 13, color: '#666' },
  syncTime: { fontSize: 12, color: '#aaa', marginTop: 8 },
  loadingText: { color: '#888', textAlign: 'center', padding: 20 },
  connectBtn: { backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  connectBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
