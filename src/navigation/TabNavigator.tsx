import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/Home/HomeScreen';
import MenstruationScreen from '../screens/Menstruation/MenstruationScreen';
import NutritionScreen from '../screens/Nutrition/NutritionScreen';
import SleepScreen from '../screens/Sleep/SleepScreen';
import PhysicalScreen from '../screens/Physical/PhysicalScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import PlateTabIcon from '../components/PlateTabIcon';
import { RootTabParamList } from '../types';

const Tab = createBottomTabNavigator<RootTabParamList>();

// Hidden screens are still navigable via navigation.navigate() from the plate —
// they just don't appear as buttons in the bottom tab bar.
const HIDDEN_TAB: object = { tabBarButton: () => null };

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B3A5A',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { borderTopWidth: 0, elevation: 0, shadowOpacity: 0 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <PlateTabIcon color={color} size={size} />,
        }}
      />
      {/* Health screens — hidden from bar, reachable from the plate */}
      <Tab.Screen name="Menstruation" component={MenstruationScreen} options={HIDDEN_TAB} />
      <Tab.Screen name="Nutrition"    component={NutritionScreen}    options={HIDDEN_TAB} />
      <Tab.Screen name="Sleep"        component={SleepScreen}        options={HIDDEN_TAB} />
      <Tab.Screen name="Physical"     component={PhysicalScreen}     options={HIDDEN_TAB} />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
