import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchTodayStats, requestHealthPermissions, HealthStats } from '../../services/healthKitService';
import TodayStatsCard from '../../components/TodayStatsCard';

export default function PhysicalScreen() {
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [loading, setLoading] = useState(true);

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
