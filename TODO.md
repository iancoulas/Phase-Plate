# PhasePlate — Build Audit & TODO

Generated 2026-07-01. Cross-references the original 10 build prompts against current codebase state.

---

## Original prompt audit

| # | Prompt | Status | Notes |
|---|--------|--------|-------|
| 1 | Project setup, folder structure, navigation, 4 tabs | ✅ Done | Nav evolved: now Home + 5 hidden health tabs + Profile. `theme.ts` was never created — colors are inline. |
| 2 | HomeScreen SVG plate with 4 tappable quadrants | ✅ Done | Sleep quadrant added beyond original spec. |
| 3 | `cycleCalculator.ts` with 20 unit tests | ✅ Done | All fields present. Parameter named `contraception` vs original `contraceptiveType` — functionally identical. |
| 4 | MenstruationScreen — calendar, phase card, log sheet, Supabase save | ✅ Done | Blue dot artifact fixed this session. |
| 5 | PhotoFoodLogger — camera → GPT-4o → EditableFoodCard → Supabase | ✅ Done | Photo not saved to device. Iron field handled. |
| 6 | Barcode scanner — Open Food Facts, 5 stages, manual fallback | ✅ Done | Uses expo-camera (expo-barcode-scanner deprecated in SDK 51+). |
| 7 | RevenueCat — SubscriptionContext, PaywallScreen, useSubscription | ⚠️ Partial | Code complete. **PaywallScreen has no navigation entry point.** RevenueCat dashboard not configured. |
| 8 | Health sync — HealthKit/Fit, TodayStatsCard, background task | ⚠️ Partial | iOS complete. **Android broken** — Google Fit sunset June 2025. Needs Health Connect migration. HealthKit entitlement not enabled in Apple portal. |
| 9 | NotificationService — 4 types, settings screen, Supabase prefs | ✅ Done | SDK 53 renamed fields fixed. |
| 10 | 9-step onboarding — slide animation, all conditions, cycle seeding | ✅ Done | Step 9 (cycle data seeding) added beyond original spec. |

---

## Also built (beyond original prompts)

- **Sleep & Energy screen** — full implementation: drum time picker, quality 1-5, energy chips, Supabase `sleep_logs` table; monthly calendar with quality colour-coding; past-date entry by tapping any calendar day
- **Auth system** — anonymous → email upgrade flow, sign in, sign out + restore anon session
- **CycleContext + CycleSettingsScreen** — cycle params load from DB, `isDefaultData` flag
- **ProfileScreen** — cycle summary card, account section, sign in/out
- **EAS build chain** — SDK 53 upgrade, Xcode 26.0 image, TestFlight build 21 submitted

---

## This session's fixes (need new EAS build to deploy)

- Sleep logs not saving → `sleep_logs` table created in Supabase; error surfaced in UI
- Sleep time picker → 15-min steppers replaced with per-minute drum/wheel pickers
- Calendar blue dot artifact → removed `marked: true` + `dots`; logged days now show red border via `customStyles`
- White screen on launch → `bootstrap()` wrapped in `try/finally` so `setAuthReady(true)` always fires
- Deep link handler → `handleAuthUrl()` in App.tsx parses Supabase email confirmation tokens from hash fragment; URL scheme registered in `app.config.js`

---

## TODO list

### 🔴 Immediate — do before or alongside the next build

**USER TASK — New EAS build + TestFlight**
All this session's fixes (drum picker, blue dot, white screen, deep link, sleep logs) are code-only.
The deep link scheme change in `app.config.js` is baked into the native binary and **requires a rebuild to take effect.**
```
eas build --profile preview --platform ios
eas submit --profile preview --platform ios
```
After build lands in TestFlight, the user on the "change email" confirmation flow can tap the link again and it will open the app directly.

---

**USER TASK — Verify Supabase redirect URL config**
Dashboard → Authentication → URL Configuration:
- Site URL: `com.coulascreations.phaseplate://`
- Redirect URLs: add `com.coulascreations.phaseplate://**` (wildcard — required so any path works)

---

### 🟠 Code work — write these prompts to Claude in order

---

**PROMPT 1 — Wire PaywallScreen into navigation** ✅ Done 2026-07-01

---

**PROMPT 2 — Move OpenAI key to Supabase Edge Function**

> The OpenAI API key is currently `EXPO_PUBLIC_OPENAI_API_KEY` which ships in the JS bundle. Before App Store launch this must move server-side. Create a Supabase Edge Function at `supabase/functions/analyze-meal/index.ts` that accepts a base64 image, calls OpenAI GPT-4o Vision, and returns the parsed nutrition JSON. Update `NutritionScreen.tsx` to call the Edge Function via `supabase.functions.invoke('analyze-meal', { body: { image: base64 } })` instead of calling OpenAI directly. Remove `EXPO_PUBLIC_OPENAI_API_KEY` from `.env.local` and `app.config.js`. Set `OPENAI_API_KEY` as a Supabase secret instead (`supabase secrets set OPENAI_API_KEY=...`). Update `supabase_setup.sql` to include the Edge Function deploy command. Keep the existing error handling and loading state in the screen unchanged.

---

**PROMPT 3 — Android Health Connect migration**

> `react-native-google-fit` returns null for all health stats since Google Fit was sunset June 2025. Migrate the Android path in `src/services/healthKitService.ts` to use `react-native-health-connect`. Install the package. In `fetchAndroidStats()`: replace all `react-native-google-fit` calls with Health Connect equivalents — `StepsRecord` for steps, `ActiveCaloriesBurnedRecord` for calories, `RestingHeartRateRecord` for resting HR. Update `requestHealthPermissions()` to request Health Connect permissions on Android. Keep the `HealthStats` interface and all iOS code unchanged. Update `app.config.js` with the Health Connect plugin if required. Test that the unified `fetchTodayStats()` still returns the same interface on both platforms.

---

**PROMPT 4 — theme.ts centralisation** ✅ Done 2026-07-01 — `src/utils/theme.ts` created; existing screens untouched.

---

### 🟡 External / config — user tasks, no code required

| Task | Where | Notes |
|------|--------|-------|
| Enable HealthKit entitlement | Apple Developer → Identifiers → phaseplate → Capabilities → HealthKit | Required before HealthKit reads work on device |
| Configure RevenueCat dashboard | RevenueCat dashboard | Create products: `plus_monthly`, `plus_annual`, `premium_monthly`, `premium_annual`. Create entitlements `plus` and `premium` (premium gets both). Create an offering. Wire to App Store Connect products. 7-day trial per product. |
| Set EAS Secrets | expo.dev → project → Secrets | Mirror all EXPO_PUBLIC_* vars. After the OpenAI Edge Function migration, remove the OpenAI key from here too. |

---

### 🔵 Future features (post-launch, from VISION.md)

These are not in the original 10 prompts. Track here for planning.

- **Journal / symptom journal** — paywalled (Plus); full text journaling tied to cycle phase
- **Recipe & meal planning** — paywalled (Plus); phase-aware meal suggestions
- **Video Vault** — paywalled (Premium); exercise / wellness video library
- **Physician PDF export** — export formatted symptom log for medical appointments
- **Referral flag** — after 3 logged symptoms of the same type in one phase, surface a prompt to see a doctor
- **Anticipatory ad placement** — surface ads before the need (e.g., sleep aids entering luteal)
- **Consent wall** — force-scroll + dual checkbox before Accept; required before public launch per legal

---

## Build state summary

```
Last TestFlight build:  1.0.0 (build 24)  — prev session's fixes shipped
Current code state:     sleep calendar added, clean TS, needs new build
Next build should be:   build 25 (autoIncrement handles it)
EAS image:              macos-sequoia-15.6-xcode-26.0  (do not change)
```
