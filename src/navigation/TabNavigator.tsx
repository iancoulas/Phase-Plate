import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import MenstruationScreen from '../screens/Menstruation/MenstruationScreen';
import NutritionScreen from '../screens/Nutrition/NutritionScreen';
import PhysicalScreen from '../screens/Physical/PhysicalScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof RootTabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Menstruation: { active: 'calendar', inactive: 'calendar-outline' },
  Nutrition: { active: 'nutrition', inactive: 'nutrition-outline' },
  Physical: { active: 'body', inactive: 'body-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
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
      <Tab.Screen name="Menstruation" component={MenstruationScreen} options={{ title: 'Cycle' }} />
      <Tab.Screen name="Nutrition" component={NutritionScreen} options={{ title: 'Nutrition' }} />
      <Tab.Screen name="Physical" component={PhysicalScreen} options={{ title: 'Physical' }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
