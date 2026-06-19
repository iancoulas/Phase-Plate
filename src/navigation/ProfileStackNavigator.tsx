import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import ProfileScreen from '../screens/Profile/ProfileScreen';
import NotificationSettingsScreen from '../screens/NotificationSettings/NotificationSettingsScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import CycleSettingsScreen from '../screens/Profile/CycleSettingsScreen';
import { ProfileStackParamList } from '../types';

const Stack = createStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ presentation: 'modal' } as object}
      />
      <Stack.Screen name="CycleSettings" component={CycleSettingsScreen} />
    </Stack.Navigator>
  );
}
