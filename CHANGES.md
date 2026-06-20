# PhasePlate — Changes Log

## 2026-06-20 — First successful TestFlight submission

### EAS build chain fully fixed

**Root cause (found and resolved):** `expo@53.0.27` was installed but all companion packages were still at SDK 52 versions (`react@18`, `react-native@0.76.7`, `expo-router@4.x`). This held `metro` at `0.81.5` when SDK 53 requires `^0.82.0`, killing every EAS build within 78 seconds.

**SDK 53 full upgrade** (commit `20c9679`)
- `react` 18.3.1 → 19.0.0
- `react-native` 0.76.7 → 0.79.6
- `expo-router` 4.0.22 → ~5.1.11
- `metro` now at 0.82.5 (pulled by react-native@0.79.6)
- 12 other expo-\* packages realigned: async-storage, background-fetch, camera, constants, image-picker, linking, notifications, splash-screen, status-bar, task-manager, reanimated, svg
- `@types/react` updated to ~19.0.10, moved from dependencies to devDependencies
- `typescript` pinned to ~5.8.3 in devDependencies
- Removed `@types/react-native` (now bundled with react-native)
- Added `expo.doctor.reactNativeDirectoryCheck.exclude` in package.json to suppress known-acceptable warnings

**Entry point fix** (commit `20c9679`)
- Created `index.js` with `registerRootComponent(App)`
- Changed `"main"` in package.json from `"expo-router/entry"` to `"index.js"`
- App uses `@react-navigation` directly — no `app/` directory exists; expo-router as entry point would crash on launch

**Push notification entitlement fix** (commit `2852ea4`)
- Removed `'expo-notifications'` from plugins in `app.config.js`
- Removed `'remote-notification'` from `UIBackgroundModes` (kept `'fetch'`)
- App uses local scheduled notifications only (no server push). The `expo-notifications` plugin adds `aps-environment: production` to the binary, which Apple rejects if the provisioning profile doesn't have Push Notifications enabled

**iOS SDK 26 compliance** (commits `a632459`, `96091a1`)
- Apple now requires all submissions to be built with iOS SDK 26 (Xcode 26) or later
- Set `"image": "macos-sequoia-15.6-xcode-26.0"` in `eas.json` under `build.production.ios`
- Note: `"latest"` resolves to Xcode 26.4 on macOS Tahoe which has compilation incompatibilities with SDK 53 native modules — use `macos-sequoia-15.6-xcode-26.0` specifically
- Set `ascAppId: "6781960320"` in `eas.json` under `submit.production.ios`

**Build 20 submitted successfully to TestFlight** — version 1.0.0 (build 20), processed by Apple, available in TestFlight at https://appstoreconnect.apple.com/apps/6781960320/testflight/ios

---

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
