import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

export type SubscriptionTier = 'free' | 'plus' | 'premium';
export type Feature = 'ai_food_log' | 'barcode_scan' | 'health_insights' | 'export_data';

const FEATURE_MIN_TIER: Record<Feature, SubscriptionTier> = {
  ai_food_log: 'plus',
  barcode_scan: 'plus',
  health_insights: 'premium',
  export_data: 'premium',
};

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, plus: 1, premium: 2 };

interface SubscriptionContextValue {
  tier: SubscriptionTier;
  loading: boolean;
  offering: unknown;
  refresh: () => Promise<void>;
  purchase: (pkg: unknown) => Promise<boolean>;
  restore: () => Promise<void>;
  isFeatureUnlocked: (feature: Feature) => boolean;
  tierForFeature: (feature: Feature) => SubscriptionTier;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  tier: 'free',
  loading: false,
  offering: null,
  refresh: async () => {},
  purchase: async () => false,
  restore: async () => {},
  isFeatureUnlocked: () => false,
  tierForFeature: (f) => FEATURE_MIN_TIER[f],
});

let Purchases: {
  configure: (opts: { apiKey: string }) => void;
  addCustomerInfoUpdateListener: (cb: (info: unknown) => void) => { remove: () => void };
  getOfferings: () => Promise<{ current: unknown }>;
  getCustomerInfo: () => Promise<{ entitlements: { active: Record<string, unknown> } }>;
  purchasePackage: (pkg: unknown) => Promise<{ customerInfo: { entitlements: { active: Record<string, unknown> } } }>;
  restorePurchases: () => Promise<{ entitlements: { active: Record<string, unknown> } }>;
} | null = null;

try {
  Purchases = require('react-native-purchases').default;
} catch {
  // Not linked in Expo Go
}

function derivetig(active: Record<string, unknown>): SubscriptionTier {
  if ('premium' in active) return 'premium';
  if ('plus' in active) return 'plus';
  return 'free';
}

export function configureSubscriptions() {
  if (!Purchases) return;
  const key = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!key) return;
  Purchases.configure({ apiKey: key });
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!Purchases) return;
    setLoading(true);
    try {
      const [info, offerings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setTier(derivetig(info.entitlements.active));
      setOffering(offerings.current);
    } catch (err) {
      console.warn('[SubscriptionContext] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!Purchases) return;
    const sub = Purchases.addCustomerInfoUpdateListener((info) => {
      const i = info as { entitlements: { active: Record<string, unknown> } };
      setTier(derivetig(i.entitlements.active));
    });
    return () => sub.remove();
  }, [refresh]);

  const purchase = useCallback(async (pkg: unknown): Promise<boolean> => {
    if (!Purchases) return false;
    try {
      const result = await Purchases.purchasePackage(pkg);
      setTier(derivetig(result.customerInfo.entitlements.active));
      return true;
    } catch {
      return false;
    }
  }, []);

  const restore = useCallback(async () => {
    if (!Purchases) return;
    try {
      const info = await Purchases.restorePurchases();
      setTier(derivetig(info.entitlements.active));
    } catch (err) {
      console.warn('[SubscriptionContext] restore error:', err);
    }
  }, []);

  const isFeatureUnlocked = useCallback(
    (feature: Feature) => TIER_RANK[tier] >= TIER_RANK[FEATURE_MIN_TIER[feature]],
    [tier]
  );

  const tierForFeature = useCallback((feature: Feature) => FEATURE_MIN_TIER[feature], []);

  return (
    <SubscriptionContext.Provider value={{ tier, loading, offering, refresh, purchase, restore, isFeatureUnlocked, tierForFeature }}>
      {children}
    </SubscriptionContext.Provider>
  );
}


export function useSubscription() {
  return useContext(SubscriptionContext);
}
