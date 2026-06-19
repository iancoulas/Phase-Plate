import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ensureAnonSession } from './src/services/supabase';
import { CycleProvider } from './src/contexts/CycleContext';
import { SubscriptionProvider, configureSubscriptions } from './src/contexts/SubscriptionContext';
import { registerHealthBackgroundSync } from './src/services/healthBackgroundSync';
import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import { fetchOnboardingProfile } from './src/services/supabase';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    configureSubscriptions();
    registerHealthBackgroundSync();

    async function bootstrap() {
      await ensureAnonSession();
      const profile = await fetchOnboardingProfile();
      setShowOnboarding(!profile);
      setAuthReady(true);
    }

    bootstrap();
  }, []);

  if (!authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SubscriptionProvider>
          <CycleProvider>
            <NavigationContainer>
              {showOnboarding ? (
                <OnboardingScreen />
              ) : (
                <TabNavigator />
              )}
            </NavigationContainer>
          </CycleProvider>
        </SubscriptionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
