# PhasePlate — Internal Notes

> Read this file at the start of every session. It records what's broken, why decisions were made, and what still needs doing.

---

## 1. Active TODOs

- [ ] **Native rebuild required** — expo-camera, expo-notifications, react-native-purchases, react-native-health all need a dev-client rebuild after install
- [ ] **Supabase RLS** — anonymous auth must be enabled in Supabase dashboard (Authentication → Providers → Anonymous Sign-Ins → Enable)
- [ ] **user_preferences table** — provision via the DDL in supabase.ts (or the schema block in INTERNAL.md §6)
- [ ] **cycle_overrides table** — provision via DDL in supabase.ts
- [ ] **OpenAI key exposure** — currently EXPO_PUBLIC_* (ships in bundle). Move to Supabase Edge Function before App Store release
- [ ] **RevenueCat dashboard config** — products, entitlements ("plus", "premium"), offerings not yet created
- [ ] **PaywallScreen not wired into nav** — no entry point yet; has onClose prop ready for modal presentation
- [ ] **First-run onboarding** — App.tsx now handles this via fetchOnboardingProfile(); verify works on clean install
- [ ] **HealthKit entitlement** — needs Apple Developer → Identifiers → Health entitlement enabled for bundle ID
- [ ] **Google Cloud Fitness API** — was sunset 2025-06-30; Android health data broken until Health Connect migration
- [ ] **ngrok paid plan** — dev-client hot-reload without burning EAS builds; set up `ngrok config add-authtoken` then use `ngrok http 8081` + paste URL into Expo Dev Tools

---

## 2. Known Issues / Watch-list

- `react-native-google-fit` — Google Fit APIs sunset 2025-06-30. fetchAndroidStats() returns nulls. Migrate to `react-native-health-connect` when targeting Android seriously.
- `expo-barcode-scanner` — deprecated/removed in SDK 51+. Replaced with `expo-camera` barcodeScannerSettings (same EAN-13/UPC-A support). Don't add it back.
- `@react-native-google-fit/react-native-google-fit` scoped package — doesn't exist on npm. Use unscoped `react-native-google-fit`.
- npm audit — 4+ moderate, 4+ high from transitive deps in react-native-google-fit. Deferred; disappears with Health Connect migration.
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

---

## 4. Decisions Log

| Decision | Why | Alternatives considered |
|----------|-----|------------------------|
| expo-camera instead of expo-barcode-scanner | expo-barcode-scanner removed in SDK 51+ | N/A |
| react-native-purchases two-entitlement model (plus + premium) | Simpler RevenueCat dashboard; Premium subsumes Plus | One entitlement per feature |
| Guarded `require()` for native health modules | Keeps app running in Expo Go / simulators without linked modules | Hard require (crash on non-native) |
| AsyncStorage cache for health stats (30 min TTL) | HealthKit/Fit queries are slow and rate-limited | No cache (slow every launch) |
| JSONB blob for notification_settings and onboarding_profile | Schema-flexible; avoids migrations for new settings | Normalised columns |
| ProfileStackNavigator wrapping Profile tab | Needed for push navigation to NotificationSettings/Onboarding | Modal presentation |
| Stepper picker for hours/days | Avoids native DateTimePicker complexity; simpler UX | React Native DateTimePicker |
| Modal presentation for Onboarding | Non-destructive; user can back out | Full-screen stack push |
| Stable string IDs in OnboardingProfile | Safe JSON contract — rename breaks saved data | Numeric indices |
| fetchOnboardingProfile() on app launch for first-run gate | Simplest check; no extra state | Dedicated "onboarding_complete" flag |
| DEFAULT auth.uid() on user_id columns | Client code doesn't need to set it; RLS still enforced | Explicit user_id in every insert |
| Hand-rolled step-config in OnboardingScreen | Fewer files; config is simple and unlikely to change | Separate config file |
| Single bundled commit approach | Avoids churn for tightly coupled phases | Many small commits |

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
- HealthKit entitlement: Identifiers → phaseplate → Health → enable
- Push notifications entitlement
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
