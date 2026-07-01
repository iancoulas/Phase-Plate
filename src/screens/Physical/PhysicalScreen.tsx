import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchTodayStats, requestHealthPermissions, HealthStats } from '../../services/healthKitService';
import TodayStatsCard from '../../components/TodayStatsCard';
import { useCycle } from '../../contexts/CycleContext';
import { calculateCyclePhase } from '../../utils/cycleCalculator';
import { getActiveAd } from '../../utils/anticipatoryAds';
import AnticipatoryAdCard from '../../components/AnticipatoryAdCard';

export default function PhysicalScreen() {
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { lastPeriodDate, cycleLength, periodLength, isDefaultData } = useCycle();

  const activeAd = useMemo(() => {
    if (isDefaultData) return null;
    try {
      const currentPhase = calculateCyclePhase({ lastPeriodDate, cycleLength, periodLength });
      return getActiveAd('physical', currentPhase);
    } catch {
      return null;
    }
  }, [isDefaultData, lastPeriodDate, cycleLength, periodLength]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const data = await fetchTodayStats();
    setStats(data);
    setLoading(false);
    if (data.permissionsGranted) {
      const fresh = await fetchTodayStats();
      setStats(fresh);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleConnect = useCallback(async () => {
    const granted = await requestHealthPermissions();
    if (granted) loadStats();
  }, [loadStats]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView>
        <Text style={styles.heading}>Physical</Text>

        {/* Anticipatory ad — surfaced a few days before the need arises (VISION.md) */}
        {activeAd && <AnticipatoryAdCard ad={activeAd} />}

        <TodayStatsCard
          stats={stats}
          loading={loading}
          onConnect={handleConnect}
          onRefresh={loadStats}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  heading: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
});
