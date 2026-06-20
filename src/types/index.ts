export type { MenstruationLog, FlowLevel, Mood, FoodLog, NotificationSettings } from '../services/supabase';

export type RootTabParamList = {
  Home: undefined;
  Menstruation: undefined;
  Nutrition: undefined;
  Physical: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  NotificationSettings: undefined;
  Onboarding: undefined;
  CycleSettings: undefined;
};
