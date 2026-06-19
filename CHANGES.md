# PhasePlate — Changes Log

## 2026-06-19 — Full codebase reconstruction (Phases 1–24)

### Reconstructed from session notes

**Core logic (Phase 3)**
- `src/utils/cycleCalculator.ts` — 20/20 tests passing; ovulationDay = cycleLength − 14; hormonal suppression collapses ovulatory phase; 7 suites
- `src/utils/cycleCalendar.ts` — PHASE_COLORS map, generateMarkedDates() for react-native-calendars

**Supabase service (Phase 4)**
- `src/services/supabase.ts` — AsyncStorage-backed session, ensureAnonSession(), saveLog(), fetchLogsForMonth(), saveFoodLog(), fetchFoodLogsForDate(), fetchUserPreferences(), saveNotificationSettings(), saveOnboardingProfile(), fetchOnboardingProfile(), saveCycleOverride(), fetchCycleOverride()
- Tables: menstruation_logs, food_logs, user_preferences, cycle_overrides

**MenstruationScreen (Phase 4–6)**
- Calendar with custom markingType, phase card with day badge and countdown, legend, animated slide-up log sheet, cramp/mood/flow/notes

**NutritionScreen (Phase 7)**
- GPT-4o Vision photo analysis, PulsingLoader, EditableFoodCard with 6 editable nutrient fields + confidence badge, Today's Plate list

**Barcode scanner (Phase 10)**
- `src/services/openFoodFacts.ts` — fetchProductByBarcode(), scalePer100g(), parseServingGrams()
- `src/components/BarcodeScannerModal.tsx` — 5 stages: scanning/looking_up/found/not_found/manual; animated sweep; expo-camera barcodeScannerSettings

**Health integration (Phase 14)**
- `src/services/healthKitService.ts` — HealthStats interface, requestHealthPermissions(), fetchTodayStats(), AsyncStorage cache
- `src/services/healthBackgroundSync.ts` — expo-background-fetch 6h task
- `src/components/TodayStatsCard.tsx` — SVG step ring with rose gradient, activity tiles

**Subscriptions (Phase 13)**
- `src/contexts/SubscriptionContext.tsx` — SubscriptionProvider with RevenueCat, two-entitlement model (plus/premium)
- `src/screens/Paywall/PaywallScreen.tsx` — three tier cards, monthly/annual toggle, savings badge, trial chip

**Notifications (Phase 16)**
- `src/services/NotificationService.ts` — schedulePillReminder, schedulePeriodPredictionAlert, schedulePhaseTransitionAlert, scheduleCustomReminder
- `src/screens/NotificationSettings/NotificationSettingsScreen.tsx` — toggles + steppers, autosave to Supabase

**Onboarding (Phase 17)**
- `src/screens/Onboarding/OnboardingScreen.tsx` — 8-step questionnaire, animated progress bar + slide, conditional postpartum sub-steps, exclusive "None" in conditions
- First-run gate in App.tsx via fetchOnboardingProfile()

**Cycle context & settings (Phase 24)**
- `src/contexts/CycleContext.tsx` — loads from cycle_overrides, falls back to logged period data
- `src/screens/Profile/CycleSettingsScreen.tsx` — date/length steppers, saves to Supabase
- Notification triggers wired to real cycle data via CycleContext

**Navigation**
- `src/navigation/TabNavigator.tsx` — 4 tabs: Cycle, Nutrition, Physical, Profile
- `src/navigation/ProfileStackNavigator.tsx` — ProfileHome, NotificationSettings, Onboarding (modal), CycleSettings

**Auth (Phase 19)**
- Anonymous auth via ensureAnonSession() on app launch
- All tables default user_id to auth.uid()

**External accounts wired (Phases 19–21)**
- Supabase URL + anon key → .env.local
- OpenAI API key → .env.local
- RevenueCat keys → .env.local (keys not yet configured in RC dashboard)
