# PhasePlate — Changes Log

## 2026-07-01 — Referral flag + physician PDF export

Implements the VISION.md Medical Guidance Philosophy: the app never diagnoses, but flags recurring patterns worth a doctor visit and can hand over an objective, disclaimer-headed log for that appointment.

### New
- **`src/utils/referralFlag.ts`** — `detectReferralFlags()`. Tracks three symptom types against `menstruation_logs`: severe cramps (`cramp_level >= 4`), low mood (`bad`/`terrible`), heavy flow (`heavy`/`very_heavy`). For each log, computes which cycle phase it fell in (via `calculateCyclePhase` with that log's own date) and counts occurrences within the user's *current* phase across all fetched history — this cross-cycle counting is what makes it "Infradian Logic" pattern detection rather than a single-cycle coincidence. Triggers at 3+ occurrences per VISION.md's spec. Each flag carries the exact "Infradian Logic Observation" alert copy and a suggested-labs list (cramp → Vitamin D, mood → TSH, flow → Full Iron Panel). 5 unit tests in `src/__tests__/referralFlag.test.ts`.
- **`src/utils/physicianExport.ts`** — `exportPhysicianSummary()`. Builds an HTML report (disclaimer header verbatim from VISION.md, suggested-labs section, chronological symptom table) and hands it to `expo-print`'s `printToFileAsync` then `expo-sharing`'s `shareAsync` so the user gets the native share sheet (Save to Files, AirDrop, Mail, Print, etc.) — no custom viewer needed.
- **`fetchLogsInRange()`** (`supabase.ts`) — arbitrary date-range log fetch, used by both the flag detector and the export (180-day window).
- **MenstruationScreen** — dismissible banner rendered per active flag, showing the alert copy with "Show me a summary" (triggers the PDF export for that flag) and "Not now" (session-only dismiss, not persisted).
- **ProfileScreen** — standalone "Physician Summary" row under MY CYCLE so users can generate the export anytime, not only when a flag fires.
- **Dependencies**: `expo-print`, `expo-sharing`.

### Notes
- Contraception type isn't threaded through cycle phase calculation here, matching how MenstruationScreen/ProfileScreen already call `calculateCyclePhase` elsewhere in the app (defaults to `'none'`).
- Flag dismissal is per-session component state only — reappears next visit if the underlying pattern still holds. No persisted "don't show again" yet.

---

## 2026-07-01 — Security pass on analyze-meal (rate limiting + payload cap)

Reviewed the `analyze-meal` Edge Function now that it's live in production. `verify_jwt: true` only confirms the caller holds *a* valid Supabase JWT — the public anon key itself qualifies, and both it and the function URL are extractable from any shipped app bundle. Without a cap, anyone could call it in a loop and bill the project's OpenAI account indefinitely.

### New
- **`analyze_meal_usage` table + `increment_analyze_meal_usage()` RPC** (`supabase_setup.sql`) — atomic per-user daily call counter. No RLS policies defined on purpose: only the Edge Function's service-role client should ever touch it, never the app directly. Applied directly to the live DB via the Supabase Management API.

### Changed
- **`analyze-meal/index.ts`**:
  - Rejects `image` payloads over ~6MB raw (base64 length > 8,000,000) with `413` — guards against oversized repeated-request abuse.
  - Extracts `sub` (user id) from the caller's JWT (already signature-verified by the platform before invocation) and increments `analyze_meal_usage` via the service-role client; returns `429` past 20 calls/day for that user. DB tracking failures fail open (logged, request still proceeds) rather than blocking legitimate use on a transient outage.
  - OpenAI error responses no longer echo raw upstream error text to the client — logged server-side, generic message returned instead.
- Redeployed and verified live: oversized payload → `413`; real anonymous-session call → `200` with `analyze_meal_usage` row incremented to `1`; test user and row deleted after verification.

---

## 2026-07-01 — Android Health Connect migration

### New
- **`react-native-health-connect@3.5.3`** — replaces `react-native-google-fit` (broken since Google Fit sunset June 2025, was returning nulls for all Android health stats).
- **`expo-build-properties`** — added to plugins to raise Android `compileSdkVersion`/`targetSdkVersion` to 35 and `minSdkVersion` to 26 (required by Health Connect).

### Changed
- **`healthKitService.ts`** — `fetchAndroidStats()` rewritten: `initialize()` → `readRecords('Steps'|'ActiveCaloriesBurned'|'RestingHeartRate'|'ExerciseSession', { timeRangeFilter })`. Steps summed from records in range; calories summed via `energy.inKilocalories`; resting HR takes the most recent sample; last workout derived from the most recent `ExerciseSession` record (title + computed duration from start/end time). `requestHealthPermissions()` Android branch now calls `HealthConnect.initialize()` + `requestPermission()` with `Steps`/`ActiveCaloriesBurned`/`RestingHeartRate`/`ExerciseSession` read scopes. `HealthStats` interface and iOS path unchanged — `fetchTodayStats()` still returns the same shape on both platforms.
- **`app.config.js`** — added `android.permissions` entries for `android.permission.health.READ_STEPS`, `READ_ACTIVE_CALORIES_BURNED`, `READ_HEART_RATE`, `READ_EXERCISE`. Added `react-native-health-connect` (config plugin auto-detected via its `app.plugin.js`) and `expo-build-properties` to the `plugins` array.
- **`package.json`** — removed `react-native-google-fit`; doctor's `reactNativeDirectoryCheck.exclude` now lists `react-native-health` and `react-native-health-connect` instead.

### Notes
- Health Connect app must be installed on the user's Android device (part of the OS on Android 14+, a separate Play Store app before that).
- Native change — requires a new development/production Android build to take effect; not testable in Expo Go.
- Play Store submission needs Google's Health Connect [permissions declaration form](https://docs.google.com/forms/d/1LFjbq1MOCZySpP5eIVkoyzXTanpcGTYQH26lKcrQUJo/viewform) — approval + whitelist propagation can take 1–2 weeks combined. Not urgent since iOS is the launch priority, but must happen before Android goes live.

---

## 2026-07-01 — OpenAI key moved server-side (Supabase Edge Function)

### New
- **`supabase/functions/analyze-meal/index.ts`** — Deno Edge Function that proxies the GPT-4o Vision call. Accepts `{ image: base64 }`, returns the same `AnalysedFood` JSON shape the client expects.
- **`supabase/functions/_shared/cors.ts`** — shared CORS headers helper for edge functions.

### Changed
- **`NutritionScreen.tsx`** — `analysePhoto()` now calls `supabase.functions.invoke('analyze-meal', { body: { image: base64 } })` instead of hitting `api.openai.com` directly. `OPENAI_KEY`/`EXPO_PUBLIC_OPENAI_API_KEY` constant removed from the client.
- **`.env.local`** — `EXPO_PUBLIC_OPENAI_API_KEY` renamed to `OPENAI_API_KEY` (no `EXPO_PUBLIC_` prefix, so Expo no longer inlines it into the JS bundle). Value kept locally only so it can be copied into `supabase secrets set`.
- **`.env.local.example`** — removed the OpenAI key line entirely (no longer a client-side var).
- **`supabase_setup.sql`** — added deploy notes (`supabase secrets set OPENAI_API_KEY=...` then `supabase functions deploy analyze-meal`).
- **`tsconfig.json`** — excluded `supabase/functions` from the app's TS project (Deno runtime globals like `Deno.serve` aren't available in the RN/Expo type environment).

### Still needed (user tasks, not code)
- Run `supabase secrets set OPENAI_API_KEY=...` and `supabase functions deploy analyze-meal` (requires Supabase CLI installed + project linked — not available in this sandbox).
- Remove `EXPO_PUBLIC_OPENAI_API_KEY` from EAS Secrets dashboard (expo.dev → project → Secrets) since it's no longer read anywhere.
- New EAS build not required for this change alone — it's a pure JS/edge-function change, no native binary impact. Still bundled with the pending build for the other queued fixes.

---

## 2026-07-01 — Sleep history calendar + past-date entry

### New
- **Sleep history calendar** (`src/screens/Sleep/SleepScreen.tsx`) — replaced the 7-day list with a full monthly calendar. Days with logged sleep are colour-coded by quality (1 = coral red, 2 = warm orange, 3 = sky blue, 4 = medium blue, 5 = deep navy). When no quality rating is stored, colour falls back to sleep duration (<6h orange, 6-7.5h light blue, 7.5h+ medium blue). A five-swatch legend below the calendar explains the scale.
- **Past-date entry** — any past day on the calendar is tappable. Tapping selects the day and shows a summary card beneath the calendar. Tapping "Log Sleep" or "Edit Entry" on that card opens the full log sheet pre-filled with that day's existing data (or blank defaults for a new entry). Saves upsert to `log_date` = selected date, not hardcoded today. Future dates are blocked (`maxDate`).
- **Month navigation** — data loads per viewed month via the calendar's `onMonthChange` callback; navigating back/forward fetches the appropriate date range from `fetchSleepLogs`.

---

## 2026-07-01 — Paywall wired + theme.ts

### New
- **PaywallScreen wired into navigation** (`ProfileStackNavigator.tsx`, `ProfileScreen.tsx`, `types/index.ts`) — `Paywall` added to `ProfileStackParamList`; registered as a modal in `ProfileStackNavigator`; new SUBSCRIPTION section in Profile tab shows "Upgrade to Plus or Premium" row for free users (taps to Paywall modal) and active tier badge + "Manage Subscription" row for subscribers.
- **`src/utils/theme.ts`** — centralised colour tokens: brand, phase swatches/backgrounds/text, subscription tiers, neutrals, status. Available for import in new screens going forward.

---

## 2026-07-01 — Deep linking + calendar fix + crash guard

### New
- **Deep link handler** (`App.tsx`) — email confirmation links (`com.coulascreations.phaseplate://#access_token=...`) now open the app and complete the Supabase session upgrade automatically. Handles both cold start (`getInitialURL`) and warm start (`addEventListener`). `onAuthStateChange` then re-checks the onboarding profile and dismisses the auth modal.
- **URL scheme registered** (`app.config.js`) — `scheme: 'com.coulascreations.phaseplate'` added at the Expo top level. Android `intentFilters` added so the scheme opens the app on Android too.

### Fixed
- **Calendar blue dot** (`cycleCalendar.ts`, `MenstruationScreen.tsx`) — removed `marked: true` + `dots` which leaked the library's default blue dot on all calendar days in `markingType="custom"` mode. Logged period days now show a red `borderWidth: 2` ring via `customStyles` instead, which is visually clear alongside the phase tints.
- **White screen on launch** (`App.tsx`) — `bootstrap()` had no error handling; if `fetchOnboardingProfile()` threw for any reason, `setAuthReady(true)` never ran and the app was permanently stuck on a blank screen. Wrapped in `try/finally` so it always unblocks.

---

## 2026-07-01 — Sleep time drum picker + README

### Updated
- **Sleep time picker** (`src/screens/Sleep/SleepScreen.tsx`) — replaced 15-minute increment stepper buttons with a drum/wheel picker (iOS-native scroll feel). Bedtime and wake time each show a scrollable hour column (12-hour, snaps per item) and a scrollable minute column (0-59, per-minute precision). AM/PM toggles beside each picker. Drums auto-scroll to the correct position each time the sheet opens via `resetKey`. Zero TS errors, no new dependencies.

### Docs
- **README.md** — rewrote from placeholder. Now covers: project structure, all 5 Supabase tables, auth flow, env vars, how to run/build/submit, core cycle logic, RevenueCat setup, known issues, and key architectural decisions.

---

## 2026-06-30 — Sleep log v1 + cycle date calendar picker

### New
- **Sleep manual log** (`src/screens/Sleep/SleepScreen.tsx`) — replaces the placeholder. Shows today's sleep card (empty state or summary) with a "Log Sleep / Edit Today" button. Log sheet slides up from the bottom (same pattern as MenstruationScreen) with: bedtime stepper (12-hour AM/PM, 15-min increments), wake time stepper, calculated sleep hours display, quality rating 1-5, energy level chips (Sluggish / Low / Normal / High / Energized), optional notes. Upserts to a new `sleep_logs` table (UNIQUE on user_id, log_date). Shows a 7-day recent history list below.
- **`sleep_logs` Supabase table** — DDL added to `supabase.ts` comment block (run in SQL Editor). `saveSleepLog` and `fetchSleepLogs` functions added. `SleepLog` type and `EnergyLevel` union type exported.

### Updated
- **CycleSettingsScreen** (`src/screens/Profile/CycleSettingsScreen.tsx`) — "Last period started" row now expands an inline `Calendar` (from `react-native-calendars/src/calendar`) on tap. Future dates blocked via `maxDate`. Selecting a day closes the calendar and updates the date. Cycle and period length steppers unchanged.

---

## 2026-06-30 — User login & profile saving

### New
- **AuthContext** (`src/contexts/AuthContext.tsx`) — wraps Supabase auth state; exposes `user`, `isAnonymous`, `loading` via `useAuth()` hook. Listens to `onAuthStateChange` for real-time session updates.
- **AuthScreen** (`src/screens/Auth/AuthScreen.tsx`) — email + password sign in / create account modal screen. Two-mode toggle (Create Account / Sign In). "Create Account" uses Supabase `updateUser` to upgrade the anonymous session to a real account, preserving all existing health data (logs, cycle settings, onboarding profile) under the same user_id. "Sign In" uses `signInWithPassword`. Branded in app rose (`#8B3A5A`).
- **Auth route in ProfileStackNavigator** — `Auth` screen added to `ProfileStackParamList`; navigates as modal from Profile tab.
- **Account section in ProfileScreen** — new ACCOUNT card at bottom of Profile tab. Anonymous users see "Create Account" and "Sign In" rows. Signed-in users see their email with a person icon and a "Sign Out" button (red).
- **Onboarding sign-in escape hatch** — "Already have an account? Sign in" link shown on step 0 of OnboardingScreen. Triggers a Modal (`<AuthScreen>`) from App.tsx. After sign-in, `onAuthStateChange` re-checks the onboarding profile and routes the user directly to the main app if they have an existing profile. Solves the "returning user on new device" flow.

### Updated
- **App.tsx** — wrapped with `AuthProvider`; `onAuthStateChange` listener re-fetches onboarding profile on non-anonymous SIGNED_IN events and auto-dismisses the auth modal.
- **supabase.ts** — added `signInWithEmail`, `linkEmailToAnonymous`, `authSignOut` (signs out then restores anonymous session so the app continues to function).

---

## 2026-06-20 — Manual food entry FAB

### New
- **Direct manual entry button** (`NutritionScreen.tsx`, `BarcodeScannerModal.tsx`) — pencil icon FAB added between the barcode and camera buttons; opens the manual entry form immediately without going through the barcode scanner flow. Added `initialStage` prop to `BarcodeScannerModal` so it can open at any stage; resets correctly on each open.

---

## 2026-06-20 — Phase 2: Alpha polish

### New
- **Profile cycle summary card** (`ProfileScreen.tsx`) — shows current phase (coloured dot), day of cycle, and next predicted period date pulled from CycleContext. Shows a prompt to set cycle dates when `isDefaultData` is true.
- **Phase-aware nutrition hint** (`NutritionScreen.tsx`) — purple banner above the daily totals card showing the current cycle phase and its first nutrition tip from `cycleCalculator`. Only shown when real cycle data exists.

### Fixed
- **Notification toggle cancellation** (`NotificationSettingsScreen.tsx`) — turning off a single notification (e.g. pill reminder while period alert stays on) now correctly cancels it. Previous logic only cancelled when all three were off. Fix: cancel-all first, then reschedule whatever is still enabled.
- **MenstruationScreen fetch error** — failed `fetchLogsForMonth` call now shows a tappable amber banner ("Could not load logs. Tap to retry.") instead of silently swallowing the error.
- **NutritionScreen fetch error** — failed `fetchFoodLogsForDate` on mount now shows a tappable error message that retries the load when tapped.

### Verified (no code changes)
- **2.4 Period prediction accuracy** — hormonal contraception path (pill/IUD/implant/injection) correctly collapses ovulatory phase to menstrual→follicular→luteal. `nextPeriodDate` calculation verified correct.
- **2.5 Onboarding → cycle seeding** — already completed in Phase 1.3 (Step 9).

---

## 2026-06-20 — Phase 1.4 / 1.6 / 1.7: Nutrition, barcode, empty states

### Fixed
- **NutritionScreen save-failure feedback** — if `saveFoodLog` returns null, the edit modal closes and an error message is shown instead of silently disappearing.
- **MenstruationScreen phase card hidden when no real data** — phase card is now only rendered when `!isDefaultData`. Previously, new users (before setting cycle dates) saw a phase card driven by defaults, which looked authoritative but was inaccurate.

### Verified (no code changes needed)
- **Barcode scanner flow** — all 5 stages (scanning → looking_up → found → not_found → manual) wired correctly; `scalePer100g` applied to serving size; `onLogged` callback updates Today's Plate list.
- **Nutrition photo log flow** — camera → GPT-4o → editable card → `saveFoodLog` → prepend to list is fully wired; `fetchFoodLogsForDate` on mount restores data across sessions.

---

## 2026-06-20 — Phase 1.2: Period logging end-to-end

### Fixed
- **Logged period dots on calendar** (`src/screens/Menstruation/MenstruationScreen.tsx`) — `fetchLogsForMonth` now called on mount and on every month navigation; days with `flow_level !== 'none'` are overlaid as red dots on the calendar, on top of the phase-tint background. Previously only *estimated* menstrual phase days showed dots; actual logged days were invisible after a session restart.
- **Log sheet state reset** — `openSheet` now resets cramp/mood/flow/notes to defaults each time it opens, so stale values from a previous entry no longer carry over to a new date.
- **Calendar refreshes after save** — `handleSave` calls `loadMonthLogs` after a successful Supabase write so the new dot appears immediately without needing to navigate away.

---

## 2026-06-20 — Phase 1.3: Onboarding cycle seeding

### New
- **Onboarding step 9 — "Your Cycle"** (`src/screens/Onboarding/OnboardingScreen.tsx`) — added as the final onboarding step; stepper UI for last period date, cycle length (21–45 days), period length (1–10 days). On Finish, saves to `cycle_overrides` in parallel with the health profile so `CycleContext` has real data from the very first launch. Eliminates the empty-calendar first-run state.

---

## 2026-06-20 — Phase 1 pre-alpha work

### New
- **Home plate quadrant UI** (`src/screens/Home/HomeScreen.tsx`) — circular SVG donut plate with 4 tappable quadrants (Cycle `#8B3A5A`, Nutrition `#6B5A2D`, Physical `#2D4A6B`, Profile `#9B59B6`). Each tap navigates to the corresponding tab. Header shows time-of-day greeting and current cycle phase badge. Uses `react-native-svg` Path elements with icon/label overlays absolutely positioned over the SVG.
- **Home tab added to TabNavigator** — Home is now the first (default) tab; existing 4 tabs remain unchanged
- **`isDefaultData` flag in CycleContext** — true when no cycle override or logged period data was found; used to prompt first-time users to set their cycle dates
- **Cycle setup prompt in MenstruationScreen** — rose-coloured banner appears when `isDefaultData` is true; tapping navigates to Profile → CycleSettings

### Updated
- **NutritionScreen daily totals** — expanded from calories-only to a full macro summary card showing calories + protein / carbs / fat breakdown
- **`ProfileStackNavigator`** — `OnboardingScreen` now wrapped in `OnboardingWithBack` so it receives `onComplete={() => navigation.goBack()}` when reached via Profile stack (fixes TS prop mismatch)
- **`NotificationService`** — updated `setNotificationHandler` for SDK 53: added `shouldShowBanner` and `shouldShowList` fields (renamed from `shouldShowAlert` in SDK 52)
- **`SubscriptionContext`** — `purchase` interface type changed from `(packageId: string)` to `(pkg: unknown)` to match implementation and PaywallScreen usage

### TypeScript
- All TS errors cleared (0 errors after fixes above)

---

## 2026-06-20 — Onboarding fix + TestFlight build 21

### Bug fix

**Onboarding Finish button not dismissing questionnaire** (commit `4d8284c`)
- After completing all 8 steps and pressing Finish, the profile saved but the screen never closed — user had to force-quit and relaunch to reach the main app
- Root cause: `handleFinish` called `navigation.goBack()`, but `OnboardingScreen` is not on a navigation stack — `App.tsx` renders it conditionally via `showOnboarding` state, so `goBack()` was a no-op
- Fix: removed `useNavigation` from `OnboardingScreen`, added `onComplete` prop; `App.tsx` passes `onComplete={() => setShowOnboarding(false)}` which immediately swaps in `TabNavigator`

---

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
