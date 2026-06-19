import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscription } from '../../hooks/useSubscription';

interface Props {
  onClose?: () => void;
}

const FEATURES = {
  free: ['Cycle tracking', 'Basic calendar', 'Phase descriptions'],
  plus: ['AI food photo logging', 'Barcode scanner', 'Nutrition insights', '7-day free trial'],
  premium: ['Everything in Plus', 'Health platform sync', 'Data export', 'Priority support', '7-day free trial'],
};

export default function PaywallScreen({ onClose }: Props) {
  const { tier, loading, offering, purchase, restore } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [busy, setBusy] = useState(false);

  function findPackage(tierName: string) {
    if (!offering || typeof offering !== 'object') return null;
    const o = offering as { availablePackages?: Array<{ identifier: string; product: { priceString: string } }> };
    return o.availablePackages?.find(p =>
      p.identifier.toLowerCase().includes(tierName) &&
      p.identifier.toLowerCase().includes(billingCycle === 'annual' ? 'annual' : 'monthly')
    ) ?? null;
  }

  async function handlePurchase(tierName: string) {
    const pkg = findPackage(tierName);
    if (!pkg) return;
    setBusy(true);
    await purchase(pkg);
    setBusy(false);
    onClose?.();
  }

  function priceFor(tierName: string, fallback: string) {
    const pkg = findPackage(tierName);
    return pkg?.product.priceString ?? fallback;
  }

  const annualSavingsPlus = '33%';
  const annualSavingsPremium = '33%';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Choose Your Plan</Text>
        <Text style={styles.sub}>Unlock tools designed around your cycle</Text>

        {/* Billing toggle */}
        <View style={styles.toggle}>
          {(['monthly', 'annual'] as const).map(cycle => (
            <TouchableOpacity
              key={cycle}
              style={[styles.toggleBtn, billingCycle === cycle && styles.toggleBtnActive]}
              onPress={() => setBillingCycle(cycle)}
            >
              <Text style={[styles.toggleText, billingCycle === cycle && styles.toggleTextActive]}>
                {cycle === 'monthly' ? 'Monthly' : 'Annual'}
                {cycle === 'annual' && <Text style={styles.savingsBadge}> Save {annualSavingsPlus}</Text>}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Free tier */}
        <View style={[styles.card, tier === 'free' && styles.cardCurrent]}>
          <Text style={styles.cardTier}>Free</Text>
          <Text style={styles.cardPrice}>£0 / forever</Text>
          {FEATURES.free.map(f => <Text key={f} style={styles.feature}>✓ {f}</Text>)}
          {tier === 'free' && <Text style={styles.currentLabel}>Current plan</Text>}
        </View>

        {/* Plus tier */}
        <View style={[styles.card, styles.cardPopular, tier === 'plus' && styles.cardCurrent]}>
          <View style={styles.popularBadge}><Text style={styles.popularText}>Most Popular</Text></View>
          <Text style={styles.cardTier}>Plus</Text>
          <Text style={styles.cardPrice}>
            {priceFor('plus', billingCycle === 'monthly' ? '£4.99/mo' : '£39.99/yr')}
          </Text>
          {FEATURES.plus.map(f => <Text key={f} style={styles.feature}>✓ {f}</Text>)}
          {tier === 'plus' ? (
            <Text style={styles.currentLabel}>Current plan</Text>
          ) : (
            <TouchableOpacity style={[styles.buyBtn, (busy || loading || !findPackage('plus')) && styles.buyBtnDisabled]} onPress={() => handlePurchase('plus')} disabled={busy || loading}>
              <Text style={styles.buyBtnText}>{busy ? '…' : findPackage('plus') ? 'Start Free Trial' : 'Plan unavailable'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Premium tier */}
        <View style={[styles.card, tier === 'premium' && styles.cardCurrent]}>
          <Text style={styles.cardTier}>Premium</Text>
          <Text style={styles.cardPrice}>
            {priceFor('premium', billingCycle === 'monthly' ? '£9.99/mo' : '£79.99/yr')}
          </Text>
          {FEATURES.premium.map(f => <Text key={f} style={styles.feature}>✓ {f}</Text>)}
          {tier === 'premium' ? (
            <Text style={styles.currentLabel}>Current plan</Text>
          ) : (
            <TouchableOpacity style={[styles.buyBtn, styles.buyBtnPremium, (busy || loading || !findPackage('premium')) && styles.buyBtnDisabled]} onPress={() => handlePurchase('premium')} disabled={busy || loading}>
              <Text style={styles.buyBtnText}>{busy ? '…' : findPackage('premium') ? 'Start Free Trial' : 'Plan unavailable'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={restore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      {onClose && (
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  scroll: { padding: 24, paddingBottom: 60 },
  heading: { fontSize: 28, fontWeight: '700', textAlign: 'center', color: '#1a1a1a', marginBottom: 8 },
  sub: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 24 },
  toggle: { flexDirection: 'row', backgroundColor: '#efefef', borderRadius: 12, padding: 4, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, color: '#888' },
  toggleTextActive: { color: '#1a1a1a', fontWeight: '600' },
  savingsBadge: { color: '#27AE60', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#efefef' },
  cardCurrent: { borderColor: '#9B59B6', borderWidth: 2 },
  cardPopular: { borderColor: '#E74C3C' },
  popularBadge: { backgroundColor: '#E74C3C', alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  popularText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTier: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  cardPrice: { fontSize: 15, color: '#9B59B6', marginBottom: 12, fontWeight: '600' },
  feature: { fontSize: 14, color: '#444', marginBottom: 6 },
  currentLabel: { marginTop: 12, color: '#9B59B6', fontWeight: '600', fontSize: 14 },
  buyBtn: { marginTop: 16, backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buyBtnPremium: { backgroundColor: '#1a1a1a' },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  restoreBtn: { alignItems: 'center', marginTop: 8 },
  restoreText: { color: '#888', fontSize: 13 },
  closeBtn: { position: 'absolute', top: 56, right: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: '#efefef', justifyContent: 'center', alignItems: 'center' },
  closeText: { color: '#666', fontSize: 16 },
});
