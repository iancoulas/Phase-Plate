# PhasePlate

Women's health app built with React Native / Expo SDK 53. Tracks cycle, sleep, nutrition, and physical wellness through the lens of infradian rhythm.

---

## Stack

| Layer | Package / Service |
|-------|------------------|
| Framework | Expo ~53.0.0, React Native 0.79.6 |
| Auth + DB | Supabase (anonymous auth, 5 tables) |
| AI | OpenAI gpt-4o (meal photo analysis) |
| Subscriptions | RevenueCat (free / plus / premium) |
| Health data | react-native-health (HealthKit) / Google Fit stub (sunset — needs Health Connect migration) |
| Navigation | @react-navigation/bottom-tabs + stack |
| Calendar | react-native-calendars (imported from `src/calendar` subpath — do not change import) |
| Build | EAS Build (macos-sequoia-15.6-xcode-26.0 image) |

---

## Project structure

```
/
├── App.tsx                  — Root: bootstrap, anon auth, onboarding gate, auth modal
├── index.js                 — Entry point (registerRootComponent)
├── app.config.js            — Expo config (bundle ID, plugins, env vars)
├── eas.json                 — EAS build profiles (development / preview / production)
├── INTERNAL.md              — Active TODOs, known issues, decision log (read at session start)
├── CHANGES.md               — What shipped each session
├── VISION.md                — Product vision from Candice (non-negotiable direction)
├── supabase_setup.sql       — DDL for all tables (run in Supabase SQL Editor)
└── src/
    ├── screens/
    │   ├── Home/            — Circular SVG plate; tappable quadrants → tabs
    │   ├── Menstruation/    — Phase calendar, log sheet, cycle phase card
    │   ├── Nutrition/       — GPT-4o photo log, barcode scanner, manual entry
    │   ├── Physical/        — HealthKit/Fit stats, step ring
    │   ├── Sleep/           — Bedtime/wake drum pickers, quality, energy, 7-day history
    │   ├── Profile/
    │   │   ├── ProfileScreen.tsx      — Cycle summary, account section
    │   │   └── CycleSettingsScreen.tsx — Calendar date picker, cycle/period length
    │   ├── Onboarding/      — 9-step questionnaire; seeds cycle_overrides on finish
    │   ├── Auth/            — Email/password; upgrades anon session (preserves data)
    │   ├── Paywall/         — 3-tier cards; not yet wired into nav
    │   └── NotificationSettings/
    ├── contexts/
    │   ├── AuthContext.tsx       — useAuth(): user, isAnonymous, loading
    │   ├── CycleContext.tsx      — Phase, day of cycle, next period; isDefaultData flag
    │   └── SubscriptionContext.tsx — RevenueCat two-entitlement model
    ├── navigation/
    │   ├── TabNavigator.tsx         — 5 tabs: Home, Cycle, Nutrition, Physical, Profile
    │   └── ProfileStackNavigator.tsx — Profile stack + CycleSettings + Notifications + Onboarding
    ├── services/
    │   ├── supabase.ts          — All DB calls + type definitions (SleepLog, FoodLog, etc.)
    │   ├── healthKitService.ts  — HealthKit / Google Fit reads, AsyncStorage cache
    │   ├── healthBackgroundSync.ts — 6h background fetch task
    │   ├── openFoodFacts.ts     — Barcode lookup
    │   └── NotificationService.ts — Local notifications (pill, period, phase transition)
    ├── utils/
    │   ├── cycleCalculator.ts   — Core logic; ovulationDay = cycleLength − 14
    │   └── cycleCalendar.ts     — PHASE_COLORS, generateMarkedDates()
    ├── components/
    │   ├── TodayStatsCard.tsx   — SVG step ring + activity tiles
    │   ├── BarcodeScannerModal.tsx — 5-stage barcode flow
    │   └── PlateTabIcon.tsx     — Custom Home tab icon
    └── types/index.ts
```

---

## Supabase tables

| Table | Key columns |
|-------|-------------|
| `menstruation_logs` | user_id, log_date, flow_level, cramp_level, mood, notes |
| `food_logs` | user_id, logged_date, name, calories, protein_g, carbs_g, fat_g, iron_mg |
| `user_preferences` | user_id, notification_settings (JSONB), onboarding_profile (JSONB) |
| `cycle_overrides` | user_id, last_period_date, cycle_length, period_length |
| `sleep_logs` | user_id, log_date (UNIQUE), bedtime, wake_time, sleep_hours, quality (1-5), energy_level, notes |

All tables default `user_id` to `auth.uid()` via `DEFAULT auth.uid()`. RLS enabled.  
DDL → `supabase_setup.sql` (and inline comments in `supabase.ts`).

---

## Auth flow

1. App launch → `ensureAnonSession()` — creates anonymous Supabase session if none exists
2. Onboarding gate — `fetchOnboardingProfile()`: if null, show `OnboardingScreen`
3. Onboarding step 9 seeds `cycle_overrides` so `CycleContext` has real data on first launch
4. "Create Account" in Profile → `updateUser({ email, password })` — upgrades anon session in-place, all user data preserved under same `user_id`
5. "Sign In" → `signInWithPassword`; `onAuthStateChange` re-checks onboarding and dismisses modal
6. `authSignOut()` signs out then immediately restores an anon session (app keeps functioning)

---

## Environment variables

All prefixed `EXPO_PUBLIC_` (ship in JS bundle — move OpenAI key to Edge Function before public release).

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_OPENAI_API_KEY
EXPO_PUBLIC_REVENUECAT_IOS_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
```

Set in `.env.local` for local dev; mirror in EAS Secrets for builds.

---

## Running locally

```bash
npm install
npx expo start          # Expo Go (limited — no HealthKit, RevenueCat)
npx expo start --dev-client  # Full features (requires dev client build)
```

> Dev client build: `eas build --profile development`  
> Stale if any native module changed since last build.

---

## Building & submitting

```bash
# Preview build (ad-hoc, TestFlight-ready)
eas build --profile preview --platform ios

# Production build + submit
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

EAS image: `macos-sequoia-15.6-xcode-26.0` (required — do not change to `latest` or macos-tahoe).  
Apple requires iOS SDK 26 (Xcode 26+) for all new submissions.

---

## Core logic

`src/utils/cycleCalculator.ts` is the heart of the app.

- `ovulationDay = cycleLength − 14`
- Hormonal contraception (pill/IUD/implant/injection) suppresses ovulatory phase → collapses to menstrual → follicular → luteal
- 20/20 unit tests passing (`npm test`)

---

## RevenueCat setup (not yet configured)

- Entitlements to create: `plus`, `premium` (Premium products grant both)
- Package IDs must contain substrings: `plus_monthly`, `plus_annual`, `premium_monthly`, `premium_annual` (matched by `findPackage()` in PaywallScreen)
- 7-day trial per product in App Store Connect

---

## Known issues / watch-list

- **Google Fit sunset** — `react-native-google-fit` returns nulls since 2025-06-30; migrate to `react-native-health-connect` for Android
- **OpenAI key in bundle** — move to Supabase Edge Function before App Store launch
- **RevenueCat dashboard** — products / entitlements / offerings not yet created
- **PaywallScreen** — not wired into navigation (no entry point yet)
- **HealthKit entitlement** — must be enabled in Apple Developer portal (Identifiers → phaseplate → HealthKit)
- **Dev client stale** — rebuild after SDK 53 upgrade before doing live development

---

## Key decisions

| Decision | Why |
|----------|-----|
| `index.js` entry + `registerRootComponent` | App uses `@react-navigation`, not expo-router file routing |
| `react-native-calendars` imported from `src/calendar` | Broken index.ts in the package breaks Metro |
| Anonymous auth default | All data preserved if user upgrades to real account via `updateUser` |
| No `expo-notifications` plugin in app.config.js | Plugin adds push entitlement; Apple rejects if provisioning profile lacks it |
| `macos-sequoia-15.6-xcode-26.0` EAS image | macos-tahoe-26.4 breaks SDK 53 native modules |
| `DEFAULT auth.uid()` on user_id columns | Client code doesn't need to set it; RLS still enforced |
| Drum/wheel picker for sleep times | iOS-native feel; per-minute selection vs 15-min stepper |

---

## External accounts

| Service | Where |
|---------|-------|
| Supabase | vbrqjqbhdxnibnlqzseq |
| EAS / Expo | project ID `1e07d8b0-4186-4fa1-8747-4b50d0b536c4` |
| Apple Developer | Bundle ID `com.coulascreations.phaseplate`, Team RCN6S9L893 |
| App Store Connect | ASC App ID `6781960320` |
| RevenueCat | Keys in `.env.local`; dashboard not yet configured |
