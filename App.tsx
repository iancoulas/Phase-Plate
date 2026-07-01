import React, { useEffect, useState } from 'react';
import { Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';

import { supabase, ensureAnonSession, fetchOnboardingProfile, fetchConsentStatus } from './src/services/supabase';
import { CycleProvider } from './src/contexts/CycleContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { SubscriptionProvider, configureSubscriptions } from './src/contexts/SubscriptionContext';
import { registerHealthBackgroundSync } from './src/services/healthBackgroundSync';
import TabNavigator from './src/navigation/TabNavigator';
import OnboardingScreen from './src/screens/Onboarding/OnboardingScreen';
import AuthScreen from './src/screens/Auth/AuthScreen';
import ConsentScreen from './src/screens/Consent/ConsentScreen';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    configureSubscriptions();
    registerHealthBackgroundSync();

    async function bootstrap() {
      try {
        await ensureAnonSession();
        const consented = await fetchConsentStatus();
        setShowConsent(!consented);
        const profile = await fetchOnboardingProfile();
        setShowOnboarding(!profile);
      } catch (err) {
        console.warn('[App] bootstrap error:', err);
        setShowOnboarding(false);
      } finally {
        setAuthReady(true);
      }
    }

    bootstrap();

    // Handle Supabase auth deep links (email confirmation / change email).
    // Supabase redirects to com.coulascreations.phaseplate://#access_token=...&refresh_token=...
    // We parse the hash fragment and hand the tokens directly to the Supabase client.
    async function handleAuthUrl(url: string) {
      const hash = url.split('#')[1];
      if (!hash) return;
      const params = Object.fromEntries(new URLSearchParams(hash));
      if (params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) console.warn('[App] deep link setSession error:', error.message);
      }
    }

    // Cold start: app opened by tapping the email link
    Linking.getInitialURL().then(url => { if (url) handleAuthUrl(url); });

    // Warm start: link tapped while app is already running
    const linkSub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    // When a real (non-anonymous) account signs in, re-check onboarding for that account.
    // Covers both the "returning user on new device" flow and post-email-confirmation.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session && !session.user.is_anonymous) {
        const profile = await fetchOnboardingProfile();
        setShowOnboarding(!profile);
        setShowAuthModal(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  if (!authReady) return null;

  // Legal consent wall — must render before anything else reaches the user.
  // No NavigationContainer, no auth modal, nothing else mounted underneath.
  if (showConsent) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ConsentScreen onAccept={() => setShowConsent(false)} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
