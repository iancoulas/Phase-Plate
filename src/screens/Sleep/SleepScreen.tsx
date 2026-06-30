import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SleepScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Sleep & Energy</Text>
      <View style={styles.placeholder}>
        <Ionicons name="moon" size={52} color="#2C5364" />
        <Text style={styles.placeholderTitle}>Coming soon</Text>
        <Text style={styles.placeholderBody}>
          Sleep tracking, energy check-ins, and phase-aware rest suggestions will live here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  heading: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 14,
    paddingBottom: 60,
  },
  placeholderTitle: { fontSize: 20, fontWeight: '700', color: '#2C5364' },
  placeholderBody: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22 },
});
