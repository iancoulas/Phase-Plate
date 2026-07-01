# PhasePlate — Internal Notes

> Read this file at the start of every session. It records what's broken, why decisions were made, and what still needs doing.

---

## 1. Active TODOs

- [ ] **Replace placeholder consent-wall legal text before launch** — `src/screens/Consent/legalText.ts` has functional but lawyer-unreviewed General Terms/Confidentiality copy so the consent-wall mechanism could be built and tested. Must be swapped for real legal text before public launch, and `CURRENT_TERMS_VERSION` in `supabase.ts` bumped afterward so already-consented users re-consent to the real text.
- [ ] **Remove Supabase personal access token from `.env.local`** — `supabase_access_token=sbp_...` (account-wide credential, not project-scoped) was added 2026-07-01 so Claude could deploy the `analyze-meal` Edge Function and set secrets directly. Gitignored, so it's not in git, but it's a live credential sitting on disk. Revoke it at https://supabase.com/dashboard/account/tokens and delete the line **at the next security-review pass / before public launch**
- [ ] **Dev client rebuild** — after the SDK 53 upgrade (react-native 0.76→0.79, expo-router 4→5), any existing dev client build is stale. Rebuild with `eas build --profile development` before doing local development
- [x] **Supabase RLS** — anonymous auth confirmed enabled (probed 2026-06-20)
- [x] **user_preferences table** — confirmed exists (probed 2026-06-20)
- [x] **cycle_overrides table** — created and confirmed 2026-06-20 (DDL in supabase_setup.sql)
- [x] **OpenAI key exposure** — moved to `supabase/functions/analyze-meal` Edge Function 2026-07-01; `NutritionScreen.tsx` calls it via `supabase.functions.invoke`. Key removed from client bundle. **User must still run** `supabase secrets set OPENAI_API_KEY=...` + `supabase functions deploy analyze-meal` (value preserved in `.env.local`), then remove old `EXPO_PUBLIC_OPENAI_API_KEY` from EAS Secrets dashboard
- [ ] **RevenueCat dashboard config** — products, entitlements ("plus", "premium"), offerings not yet created
- [x] **PaywallScreen wired into nav** — added to ProfileStackNavigator + Profile tab SUBSCRIPTION section 2026-07-01
- [x] **User login & profile saving** — AuthContext + AuthScreen + authSignOut added 2026-06-30; Profile tab ACCOUNT section; "Create Account" upgrades anon → real via Supabase updateUser (data preserved); "Sign In" via signInWithPassword; onboarding escape hatch on step 0 for returning users on new devices
- [x] **Sleep log v1** — SleepScreen has bedtime/wake drum pickers (per-minute, iOS wheel-scroll style), quality 1-5, energy chips, notes, today card + 7-day history; sleep_logs table DDL now in supabase_setup.sql — **must be run in Supabase SQL Editor if not done yet**
- [x] **CycleSettings calendar picker** — last period date now uses inline Calendar from react-native-calendars (same import as MenstruationScreen); future dates blocked via maxDate
- [ ] **First-run onboarding** — App.tsx handles via fetchOnboardingProfile(); verify works on clean install
- [x] **Deep linking for email confirmation** — scheme registered in app.config.js; handleAuthUrl in App.tsx parses hash fragment and calls setSession; requires new EAS build to take effect
- [ ] **HealthKit entitlement** — needs Apple Developer → Identifiers → Health entitlement enabled for bundle ID (separate from code — must be done in the portal)
- [ ] **Replace placeholder icons** — assets/icon.png etc. are solid-colour placeholder PNGs; replace with real branded artwork before public App Store launch
- [x] **Google Cloud Fitness API sunset → Health Connect migration** — done 2026-07-01. `react-native-google-fit` removed; `healthKitService.ts` Android path now uses `react-native-health-connect` (`readRecords` for Steps/ActiveCaloriesBurned/RestingHeartRate/ExerciseSession). Needs a new Android build to test on device; Play Store also needs Google's Health Connect declaration form approved before Android launch
- [ ] **ngrok paid plan** — dev-client hot-reload without burning EAS builds; set up `ngrok config add-authtoken` then use `ngrok http 8081` + paste URL into Expo Dev Tools
- [x] **Home plate quadrant UI** — completed 2026-06-20; SVG circular plate with 4 tappable quadrants, Home tab added
- [x] **Cycle setup prompt** — first-run banner in MenstruationScreen when no cycle data set; taps through to CycleSettings
- [x] **Phase 2 alpha polish** — notification cancel-all-then-reschedule fix; profile cycle summary card; phase-aware nutrition hint; fetch error/retry banners on Cycle and Nutrition screens
- [x] **Nutrition photo logging end-to-end** — camera → GPT-4o → editable card → food_logs → list; save-failure now shows error message; fetchFoodLogsForDate restores across sessions
- [x] **Barcode scanner** — verified: all 5 stages correct, serving scaler, onLogged callback; no code changes needed
- [x] **Empty states** — nutrition FlatList empty text ✅; physical connect/loading states ✅; cycle phase card hidden when isDefaultData to prevent misleading default-data display
- [x] **Period logging end-to-end** — MenstruationScreen fetches month logs from Supabase; actual logged flow days show as red dots overlaid on phase tints; sheet resets on open; calendar refreshes immediately after save
- [x] **Onboarding cycle seeding** — Step 9 added to OnboardingScreen; collects last period date, cycle length, period length; `handleFinish` saves to `cycle_overrides` in parallel with health profile so CycleContext has real data on first launch
- [x] **Referral flag + physician PDF export** — done 2026-07-01. `detectReferralFlags()` counts severe-cramp/low-mood/heavy-flow occurrences per current cycle phase across a 180-day log window; 3+ triggers the VISION.md "Infradian Logic Observation" banner in MenstruationScreen (dismissible, session-only). `exportPhysicianSummary()` builds a disclaimer-headed HTML → PDF via expo-print + expo-sharing's native share sheet; entry points are the banner's "Show me a summary" button and a standalone "Physician Summary" row in ProfileScreen. 5 unit tests added.
- [x] **Consent wall** — done 2026-07-01. `ConsentScreen` gates the entire app (rendered instead of NavigationContainer, no modal to dismiss) until the user scrolls to the bottom and checks both boxes. Recorded server-side in `consent_records` (audit trail, not just a local flag) via `CURRENT_TERMS_VERSION`. **The legal text in `src/screens/Consent/legalText.ts` is placeholder only — not written or reviewed by a lawyer. Must be replaced with real Terms of Service / Confidentiality Notice text before public launch**, and `CURRENT_TERMS_VERSION` bumped once it is (forces re-consent).
- [x] **Anticipatory ad placement** — done 2026-07-01. `getActiveAd()` in `anticipatoryAds.ts` surfaces house/placeholder content per quadrant a configurable number of days before the relevant cycle phase begins (2 days for menstrual/period-adjacent, 3 for luteal/nutrition). Wired into all 4 quadrant screens as a small "Suggested for you" card. **No real ad network account exists — `AD_CONTENT` is placeholder copy to swap once one is set up.** "Localized class ads" (location-based) explicitly not built — different mechanism.

---

## 2. Known Issues / Watch-list

- `react-native-health-connect` — Android health data now reads via Health Connect; requires the Health Connect app on-device (bundled with OS on Android 14+, separate Play Store install before that) and a real native build (not usable in Expo Go).
- `expo-barcode-scanner` — deprecated/removed in SDK 51+. Replaced with `expo-camera` barcodeScannerSettings (same EAN-13/UPC-A support). Don't add it back.
- `analyze-meal` daily cap is hardcoded to 1 call/user/day in the Edge Function source (`DAILY_CALL_LIMIT`) as of 2026-07-01 — intentionally tight since photo logging is a free-tier feature. Bumping it means redeploying with a new constant; no dashboard config or subscription-tier check exists yet.
- `react-native-google-fit` fully removed 2026-07-01 (see Health Connect migration above) — the npm-audit vulnerabilities it carried are gone with it.
- OFF data quality — Open Food Facts data is crowdsourced; values can be wrong or missing. Manual entry fallback exists.
- Iron field — tracked as `iron_mg` in food_logs but OpenAI may not always return it. Defaults to 0 gracefully.
- Duplicate-scan guard — `lastScanRef` in BarcodeScannerModal prevents same barcode firing twice. Camera-level de-dupe only; no DB dedup.
- Background-fetch determinism — iOS/Android don't guarantee 6-hour intervals; can be throttled by battery optimisation.

---

## 3. Errors Hit & Resolved

| Date | Error | Fix |
|------|-------|-----|
| Phase 5 | Black screen — Metro failing on react-native-calendars/src/index.ts | Deleted metro.config.js, imported Calendar directly from `react-native-calendars/src/calendar` |
| Phase 11 | TS2307 missing expo-camera module | `npm install expo-camera@~17.0.8` |
| Phase 14 | `@react-native-google-fit/react-native-google-fit` 404 on npm | Switched to unscoped `react-native-google-fit@^0.22.1` |
| Phase 23 | EAS Build can't see .env.local (gitignored) | Set env vars in EAS dashboard |
| Phase 23 | Anonymous auth toggle didn't save (Supabase UI bug) | Verify with curl, not dashboard UI |
| Phase 23 | Supabase Users page hides anonymous users | Use "All users" filter, not "Verified only" |
| Phase 23 | saveLog/saveFoodLog rejected by RLS (no user_id) | Added DEFAULT auth.uid() to DB columns |
| Phase 23 | LogSheet collapsed (no height for KeyboardAvoidingView) | Added minHeight to sheet container |
| Phase 23 | expo start --tunnel unreliable via @expo/ngrok v2 | Use paid ngrok v3 with separate tunnel + manual URL |
| Phase 23 | Free EAS iOS builds exhausted in one day | One per project; use preview profile sparingly |
| Phase 23 | OpenAI photo-analysis error (exact message TBC) | Deferred — needs device reproduction |
| 2026-06-20 | EAS builds failing at ~78 seconds (all builds) | SDK mismatch: expo@53 installed but companion packages (react, react-native, expo-router) still at SDK 52. metro held at 0.81.5 by react-native@0.76.7. Fix: run `npx expo install` to align all packages with installed SDK version |
| 2026-06-20 | `"main": "expo-router/entry"` in package.json but no app/ directory | App uses @react-navigation, not expo-router file routing. Fix: create index.js with registerRootComponent, change "main" to "index.js" |
| 2026-06-20 | Apple rejects submission: "Something went wrong" | Two causes: (1) expo-notifications plugin adds aps-environment:production entitlement but provisioning profile lacks Push Notifications capability. Fix: remove expo-notifications from plugins + remove remote-notification from UIBackgroundModes. (2) EAS default Xcode is pre-SDK-26; Apple requires Xcode 26+. Fix: set image in eas.json |
| 2026-06-20 | image:"latest" in eas.json → build errors in 2 min | "latest" resolves to macos-tahoe-26.4-xcode-26.4 which has native module compilation incompatibilities with SDK 53. Use macos-sequoia-15.6-xcode-26.0 instead |
| 2026-06-20 | Onboarding Finish button saves but doesn't close screen | OnboardingScreen called navigation.goBack() but is not on a nav stack — rendered conditionally by App.tsx. Fix: add onComplete prop, App.tsx passes () => setShowOnboarding(false) |
| 2026-06-20 | TS: OnboardingScreen `onComplete` required but ProfileStackNavigator can't pass it | OnboardingScreen has required prop; nav screens can't receive component props. Fix: wrap in `OnboardingWithBack` component that calls `navigation.goBack()` |
| 2026-06-20 | TS: NotificationService SDK 53 `NotificationBehavior` missing fields | SDK 53 renamed `shouldShowAlert` to `shouldShowBanner` + `shouldShowList`. Fixed both fields. |
| 2026-06-20 | TS: `FoodLog` has no `created_at` field | Used as FlatList key extractor — dropped `created_at` fallback, use `id` or random string only |

---

## 4. Decisions Log

| Decision | Why | Alternatives considered |
|----------|-----|------------------------|
| `react-native-health-connect` for Android health data | Google Fit APIs sunset June 2025; Health Connect is the current Android platform standard, actively maintained, typed API | `@kingstinct/react-native-healthkit`-style alternatives are iOS-only; no viable Google Fit replacement besides Health Connect |
| Supabase personal access token in `.env.local` (gitignored) for CLI auth | Lets Claude run `supabase secrets set`/`functions deploy` directly instead of the user copy-pasting commands each session | User runs commands manually (more friction, chosen against per user request 2026-07-01). **Revisit at next security review — see Active TODOs** |
| `updateUser({ email, password })` for "Create Account" | Upgrades anonymous session in-place; all user data (logs, cycle, onboarding) preserved under same user_id | signUp (creates new user, orphans anon data) |
| Auth modal from App.tsx for onboarding sign-in | OnboardingScreen renders outside NavigationContainer; can't use `navigation.navigate` from there | Inline auth form in OnboardingScreen (coupling) |
| `onAuthStateChange` re-checks onboarding on SIGNED_IN (non-anon) | Handles "returning user on new device" flow without requiring nav changes | Manual refresh button after sign-in |
| expo-camera instead of expo-barcode-scanner | expo-barcode-scanner removed in SDK 51+ | N/A |
| react-native-purchases two-entitlement model (plus + premium) | Simpler RevenueCat dashboard; Premium subsumes Plus | One entitlement per feature |
| Guarded `require()` for native health modules | Keeps app running in Expo Go / simulators without linked modules | Hard require (crash on non-native) |
| AsyncStorage cache for health stats (30 min TTL) | HealthKit/Fit queries are slow and rate-limited | No cache (slow every launch) |
| JSONB blob for notification_settings and onboarding_profile | Schema-flexible; avoids migrations for new settings | Normalised columns |
| ProfileStackNavigator wrapping Profile tab | Needed for push navigation to NotificationSettings/Onboarding | Modal presentation |
| Drum/wheel picker for sleep times | Per-minute precision; iOS-native feel; no extra dependencies | React Native DateTimePicker, 15-min stepper (original) |
| Modal presentation for Onboarding | Non-destructive; user can back out | Full-screen stack push |
| Stable string IDs in OnboardingProfile | Safe JSON contract — rename breaks saved data | Numeric indices |
| fetchOnboardingProfile() on app launch for first-run gate | Simplest check; no extra state | Dedicated "onboarding_complete" flag |
| DEFAULT auth.uid() on user_id columns | Client code doesn't need to set it; RLS still enforced | Explicit user_id in every insert |
| Hand-rolled step-config in OnboardingScreen | Fewer files; config is simple and unlikely to change | Separate config file |
| Single bundled commit approach | Avoids churn for tightly coupled phases | Many small commits |
| Use macos-sequoia-15.6-xcode-26.0 EAS image | Satisfies Apple's iOS SDK 26 requirement; earlier than macos-tahoe which breaks SDK 53 native modules | macos-tahoe-26.4-xcode-26.4 (breaks), no image (pre-SDK-26, Apple rejects) |
| Remove expo-notifications from plugins | App uses local notifications only; plugin adds push entitlement that mismatches provisioning profile | Add push capability to profile (unnecessary complexity) |
| registerRootComponent + index.js entry | App uses @react-navigation, not file-based routing; expo-router/entry crashes with no app/ dir | Migrate to expo-router file routing (large refactor) |
| SVG plate with absolute-positioned overlay (not SVG Text/ForeignObject) | Ionicons can't render inside SVG in React Native; absolute-positioned Views over the SVG canvas is the standard workaround | Emoji-only SVG text (no branded icons) |
| `isDefaultData` flag on CycleContext (not a separate Supabase call) | Cheapest way to detect first-run state without extra round trips | Separate `hasSetCycleData` field in user_preferences |

---

## 5. External Setup Checklist

### Supabase
- Project URL: `EXPO_PUBLIC_SUPABASE_URL`
- Anon key: `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Anonymous auth: Authentication → Providers → Anonymous Sign-Ins → Enable
- Schema: paste DDL from supabase.ts into SQL Editor → Run
- Tables to provision: `menstruation_logs`, `food_logs`, `user_preferences`, `cycle_overrides`

### OpenAI
- Key: `EXPO_PUBLIC_OPENAI_API_KEY`
- Set monthly budget cap ($20) BEFORE creating key
- Model: gpt-4o, ~400 tokens/call, ~$0.005–$0.01 per photo
- ⚠️  Key ships in JS bundle — move to Edge Function before App Store

### RevenueCat
- iOS key: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- Android key: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- Entitlements: `plus`, `premium` (Premium products should attach BOTH entitlements)
- Package naming convention: `plus_monthly`, `plus_annual`, `premium_monthly`, `premium_annual` (must match findPackage() substring logic in PaywallScreen)
- 7-day trial configured per product in App Store Connect / Play Console

### Expo / EAS
- Project ID: `1e07d8b0-…` (already in app.config.js)
- Profiles: `development` (dev client), `preview` (ad-hoc TestFlight), `production`
- EAS Secrets: mirror all EXPO_PUBLIC_* vars at https://expo.dev → project → Secrets

### Apple Developer ($99/yr)
- Bundle ID: `com.coulascreations.phaseplate`
- HealthKit entitlement: Identifiers → phaseplate → Health → enable (required for react-native-health to work at runtime)
- **Do NOT enable Push Notifications** — app uses local notifications only; enabling it would require a provisioning profile re-issue and is unnecessary
- Distribution cert + provisioning profiles (EAS manages automatically)

### Google Play ($25 one-time)
- Package: `com.coulascreations.phaseplate`
- Service account JSON for EAS submit

---

## 6. Health Platform Integrations

### iOS — Apple HealthKit
1. Enable HealthKit entitlement in Apple Developer portal (Identifiers → select app → Capabilities → HealthKit)
2. `react-native-health` reads: StepCount, ActiveEnergyBurned, RestingHeartRate, HeartRateSample, Workout
3. Resting HR uses the most recent sample from the last day (may differ from Apple's resting HR calculation)
4. Rebuild dev client after any native module change

### Android — Health Connect migration plan
- Google Fit sunset 2025-06-30; `react-native-google-fit` returns nulls
- Migration target: `react-native-health-connect` (official replacement)
- All Android health logic is isolated in `fetchAndroidStats()` in healthKitService.ts
- Resting HR on Health Connect: `RestingHeartRateRecord` (proper resting HR, not min-of-samples)
- Steps: `StepsRecord` aggregated over the day
- Active calories: `ActiveCaloriesBurnedRecord`

---

## 7. How to Use This File

- **Start of session**: read Active TODOs and recent Errors
- **During session**: add errors as you hit them, tick TODOs when done
- **End of session**: log decisions made and update Known Issues
- Companion: CHANGES.md tracks what shipped each day
