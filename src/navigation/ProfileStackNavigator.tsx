import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';

import ProfileScreen from '../screens/Profile/ProfileScreen';
import NotificationSettingsScreen from '../screens/NotificationSettings/NotificationSettingsScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import CycleSettingsScreen from '../screens/Profile/CycleSettingsScreen';
import AuthScreen from '../screens/Auth/AuthScreen';
import { ProfileStackParamList } from '../types';

const Stack = createStackNavigator<ProfileStackParamList>();

function OnboardingWithBack() {
  const navigation = useNavigation();
  return <OnboardingScreen onComplete={() => navigation.goBack()} />;
}

function AuthWithBack() {
  const navigation = useNavigation();
  return <AuthScreen onBack={() => navigation.goBack()} />;
}

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingWithBack}
        options={{ presentation: 'modal' } as object}
      />
      <Stack.Screen name="CycleSettings" component={CycleSettingsScreen} />
      <Stack.Screen
        name="Auth"
        component={AuthWithBack}
        options={{ presentation: 'modal' } as object}
      />
    </Stack.Navigator>
  );
}
