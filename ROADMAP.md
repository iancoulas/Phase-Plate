# PhasePlate — Development Roadmap

> Priority order: simplest first, no new API/account dependencies until late phases.
> Pre-alpha goal: Period + Nutrition sections functional for test group.

---

## Current State (as of 2026-06-20)

**Working:**
- Onboarding questionnaire (8 steps, saves to Supabase) — finish button now fixed
- Cycle screen — calendar with phase colours, period logging, cramp/mood/flow/notes
- Nutrition screen — AI photo logging (OpenAI), barcode scanner (Open Food Facts), Today's Plate list
- Physical screen — HealthKit stats display (steps, calories, HR)
- Profile screen — cycle settings, notification settings
- Supabase — anonymous auth, all 4 tables, RLS
- Background health sync

**Missing / broken:**
- No home plate quadrant UI (was in original spec PP-021, not carried over in reconstruction)
- Paywall has no navigation entry point
- RevenueCat dashboard not configured (products/entitlements not created)
- HealthKit entitlement not enabled in Apple Developer portal
- Placeholder icons (not branded)
- OpenAI key is in the JS bundle (security risk before public launch)

---

## Phase 1 — Pre-Alpha: Core Flow (no new accounts needed)

Goal: testers can complete onboarding, log periods, and log meals.

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 1.1 | **Home plate quadrant UI** | `src/screens/Home/HomeScreen.tsx`, `src/navigation/TabNavigator.tsx` | SVG circular plate, 4 tappable quadrants (Cycle, Nutrition, Physical, Profile). Add Home as the first tab. Cream background `#F5EDE8`. Colours: Cycle `#8B3A5A`, Physical `#2D4A6B`, Nutrition `#6B5A2D`, Profile `#9B59B6` |
| 1.2 | **Verify period logging end-to-end** | `MenstruationScreen.tsx` | Confirm: cycle phase calculated from CycleContext, calendar renders phase tints, log sheet saves to Supabase menstruation_logs, data persists across sessions |
| 1.3 | **Cycle settings pre-filled from onboarding** | `CycleSettingsScreen.tsx`, `CycleContext.tsx` | On first open, cycle length/last period date from onboarding profile should seed CycleContext so calendar isn't empty |
| 1.4 | **Verify nutrition photo logging end-to-end** | `NutritionScreen.tsx` | Confirm: camera opens, GPT-4o returns JSON, EditableFoodCard shows, confirmed log saves to Supabase food_logs, Today's Plate updates |
| 1.5 | **Daily nutrition totals** | `NutritionScreen.tsx` | Sum today's food_logs and show a simple daily totals bar (calories / protein / carbs / fat) above Today's Plate list |
| 1.6 | **Verify barcode scanner** | `BarcodeScannerModal.tsx` | Confirm EAN-13/UPC-A scan → Open Food Facts fetch → serving calc → log to Supabase |
| 1.7 | **Empty states** | All screens | Add friendly empty-state messages when no data logged yet (first-time tester experience) |
| 1.8 | **Provision Supabase tables** | — (admin task) | Run DDL from `supabase.ts` for `user_preferences` and `cycle_overrides` tables if not already done. Verify anonymous auth is enabled. |

---

## Phase 2 — Alpha Polish (code only, no new accounts)

Goal: screens feel complete, navigation is intuitive, notifications work.

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 2.1 | **Notification scheduling wired up** | `NotificationSettingsScreen.tsx`, `NotificationService.ts` | Verify pill reminder, period prediction alert, and phase transition alert all schedule correctly and fire. Requires expo-notifications permission prompt on first use |
| 2.2 | **Profile screen — summary card** | `ProfileScreen.tsx` | Show current cycle phase, day of cycle, next predicted period date pulled from CycleContext |
| 2.3 | **Phase-aware nutrition hints** | `NutritionScreen.tsx` | Small banner above food logger: "In your luteal phase — focus on magnesium and complex carbs" based on CycleContext current phase |
| 2.4 | **Period prediction accuracy** | `cycleCalculator.ts` | Validate predictions feel correct for hormonal contraception users (the most common onboarding answer). QA with a few manual test cases |
| 2.5 | **Onboarding → cycle seeding** | `App.tsx`, `CycleContext.tsx` | After onboarding completes, prompt user to enter last period date + cycle length if not already in cycle_overrides (bridges onboarding → calendar being useful immediately) |
| 2.6 | **Loading / error states** | `NutritionScreen.tsx`, `MenstruationScreen.tsx` | Supabase fetch errors should show a retry message, not a blank screen |

---

## Phase 3 — Requires Existing Accounts (Supabase + OpenAI already set up)

Goal: health data visible, all existing APIs exercised.

| # | Task | Account needed | Notes |
|---|------|----------------|-------|
| 3.1 | **HealthKit entitlement enabled** | Apple Developer portal | Identifiers → `com.coulascreations.phaseplate` → Capabilities → HealthKit → Enable. Then rebuild. Without this, react-native-health silently returns nulls |
| 3.2 | **Physical screen live data** | Apple Developer | After 3.1, verify step count, active calories, resting HR all populate on device |
| 3.3 | **Background health sync** | — | `healthBackgroundSync.ts` task runs every 6h. Verify it fires on device (check Supabase for background writes) |
| 3.4 | **OpenAI error handling** | OpenAI | Rate limit / bad-photo responses currently deferred. Add user-facing error with retry option |

---

## Phase 4 — Monetisation (RevenueCat account setup required)

| # | Task | Account needed | Notes |
|---|------|----------------|-------|
| 4.1 | **RevenueCat dashboard setup** | RevenueCat + App Store Connect | Create products in App Store Connect: `plus_monthly` ($4.99), `plus_annual` ($39.99), `premium_monthly` ($9.99), `premium_annual` ($79.99). Create entitlements `plus` and `premium`. Create Offering with all 4 packages. Set 7-day free trial per product |
| 4.2 | **Wire Paywall into navigation** | — | `PaywallScreen` exists but has no entry point. Add a "Go Plus" button in Profile screen that presents it as a modal |
| 4.3 | **Gate AI features behind subscription** | — | `isFeatureUnlocked('ai_food_log')` check in NutritionScreen — free users see a prompt to upgrade instead of the camera FAB. `useSubscription()` hook already exists |
| 4.4 | **Restore purchases flow** | — | Add "Restore Purchases" button in Profile screen |

---

## Phase 5 — Pre-Launch (before public App Store submission)

| # | Task | Notes |
|---|------|-------|
| 5.1 | **Real branded icons** | Replace `assets/icon.png`, `splash-icon.png`, `adaptive-icon.png` with final artwork (1024×1024 PNG) |
| 5.2 | **Move OpenAI key to Supabase Edge Function** | Key currently ships in the JS bundle. Create an Edge Function `analyze-meal` that proxies the OpenAI call. Critical before public launch |
| 5.3 | **Android Health Connect migration** | Google Fit sunset June 2025. Replace `react-native-google-fit` with `react-native-health-connect` for Android |
| 5.4 | **App Store metadata** | Screenshots, description, age rating, privacy policy URL, support URL |
| 5.5 | **Privacy manifest audit** | Verify `PrivacyInfo.xcprivacy` entries cover all API usage (AsyncStorage → NSFileManager, etc.) |
| 5.6 | **TestFlight external group** | Expand from internal to external testers via App Store Connect |

---

## Quick Reference — APIs / Accounts Status

| Service | Status | Needed for |
|---------|--------|-----------|
| Supabase | ✅ Configured | Auth, all data storage |
| OpenAI | ✅ Key set | Meal photo analysis |
| Apple Developer | ✅ Active | Builds, HealthKit entitlement (portal action needed) |
| RevenueCat | ⚠️ Keys set, dashboard empty | Subscriptions (Phase 4) |
| Google Fit | ❌ Sunset | Android health (migrate in Phase 5) |

---

## Next Session Starting Point

Begin with **Phase 1.1 — Home plate quadrant UI**. This is pure UI code using `react-native-svg` (already installed) and requires no account setup. Once the plate is in place, work through 1.2–1.7 to verify the full pre-alpha flow works end-to-end before the first tester build.
