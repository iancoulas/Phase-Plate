import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AdContent } from '../utils/anticipatoryAds';

export default function AnticipatoryAdCard({ ad }: { ad: AdContent }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="pricetag-outline" size={14} color="#999" />
        <Text style={styles.sponsoredLabel}>Suggested for you</Text>
      </View>
      <Text style={styles.title}>{ad.title}</Text>
      <Text style={styles.body}>{ad.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, marginBottom: 0, backgroundColor: '#FAF9F6', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#ECE9E2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  sponsoredLabel: { fontSize: 11, fontWeight: '600', color: '#999', letterSpacing: 0.4, textTransform: 'uppercase' },
  title: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  body: { fontSize: 13, color: '#555', lineHeight: 18 },
});
