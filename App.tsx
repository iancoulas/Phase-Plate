import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { supabase, ensureAnonSession, fetchOnboardingProfile } from './src/services/supabase';
import { CycleProvider } from './src/contexts/CycleContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider, configureSubscriptions } from './src/contexts/SubscriptionContext';
import { registerHealthBackgroundSync } from './src/services/healthBackgroundSync';
import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import AuthScreen from './src/screens/Auth/AuthScreen';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

    // When a real (non-anonymous) account signs in, re-check onboarding for that account.
    // This handles "returning user on new device": they sign in and their existing
    // onboarding profile loads, bypassing the questionnaire.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && !session.user.is_anonymous) {
        const profile = await fetchOnboardingProfile();
        setShowOnboarding(!profile);
        setShowAuthModal(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <CycleProvider>
              <NavigationContainer>
                {showOnboarding ? (
                  <OnboardingScreen
                    onComplete={() => setShowOnboarding(false)}
                    onSignIn={() => setShowAuthModal(true)}
                  />
                ) : (
                  <TabNavigator />
                )}
              </NavigationContainer>

              {/* Auth modal — available over onboarding and main app */}
              <Modal
                visible={showAuthModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAuthModal(false)}
              >
                <SafeAreaProvider>
                  <AuthScreen onBack={() => setShowAuthModal(false)} />
                </SafeAreaProvider>
              </Modal>
            </CycleProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
