import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/Home/HomeScreen';
import MenstruationScreen from '../screens/Menstruation/MenstruationScreen';
import NutritionScreen from '../screens/Nutrition/NutritionScreen';
import SleepScreen from '../screens/Sleep/SleepScreen';
import PhysicalScreen from '../screens/Physical/PhysicalScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof RootTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Home:         { active: 'apps',             inactive: 'apps-outline' },
  Menstruation: { active: 'calendar',         inactive: 'calendar-outline' },
  Nutrition:    { active: 'nutrition',        inactive: 'nutrition-outline' },
  Sleep:        { active: 'moon',             inactive: 'moon-outline' },
  Physical:     { active: 'body',             inactive: 'body-outline' },
  Profile:      { active: 'person',           inactive: 'person-outline' },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#9B59B6',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"         component={HomeScreen}            options={{ title: 'Home' }} />
      <Tab.Screen name="Menstruation" component={MenstruationScreen}    options={{ title: 'Cycle' }} />
      <Tab.Screen name="Nutrition"    component={NutritionScreen}       options={{ title: 'Nutrition' }} />
      <Tab.Screen name="Sleep"        component={SleepScreen}           options={{ title: 'Sleep' }} />
      <Tab.Screen name="Physical"     component={PhysicalScreen}        options={{ title: 'Physical' }} />
      <Tab.Screen name="Profile"      component={ProfileStackNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
