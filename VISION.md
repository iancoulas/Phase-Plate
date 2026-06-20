# PhasePlate — Product Vision & Direction

> This document summarizes the product owner's (Candice Coulas) emails from May 2025. It is the canonical reference for what PhasePlate is, why it exists, and how it should behave. Read this before making product decisions.

---

## Core Concept

PhasePlate is a women's health app built around four pillars: **Menstruation, Sleep/Energy, Nutrition, and Physical Wellness (Strength/Weight Management).**

The UI metaphor is a **plate divided into four quadrants**. Tapping a quadrant "unfolds" it onto the plate to reveal information relevant to that section. The "unfolding" animation is the preferred interaction — it mirrors the concept of unfolding the mystery of women's health. A clockwise "sweep" (like clock hands) is an acceptable fallback if the unfold proves too complex.

The app is explicitly designed for the complexity of women's health, which involves far more interdependencies than male-centric health apps. The infradian rhythm (the ~28-day hormonal cycle) is the underlying logic connecting all four quadrants.

---

## Onboarding & Health Questionnaire

On first use, the app must gather a health profile. Questions include:

- What contraceptive measures is she using?
- Has she entered any stage of menopause?
- Is she postpartum? Nursing? Type of birth (vaginal or C-section)?
- Does she have any menstrual disorders (PCOS, endometriosis, etc.)?
- Hypothyroidism or hyperthyroidism?
- Prescribed medications or supplements?
- Work type: sedentary, active, or mixed? Regulated schedule or shift work?
- Goals: cycle familiarity, nutrition management, weight management, strength building, improved sleep?

This profile shapes recommendations across all four quadrants.

---

## The Four Quadrants

### 1. Menstruation

- Calendar view when the quadrant unfolds
- Menstrual phase highlights on calendar (estimated ranges)
- Periods of bleeding marked with red dots
- Symptom tracking
- Contraceptive-aware logic (pill reminders, IUD, etc.)
- Push notifications:
  - "Take your pill."
  - "Your period is expected in X days."
  - "You're moving into [phase]. Consider making these changes."
- Relevant ads: period products (panties, cups, tampons, pads), pain relief (Midol, Tylenol, Advil), comfort items (ice cream, chocolate), local spas/salons
- **Anticipatory ad logic**: surface ads a couple of days *before* the need arises (e.g., Midol before cramping begins — not during)

### 2. Sleep / Energy

- Sleep tracking: duration and subjective rest quality
- Energy tracking: sluggish, bursts, consistently normal, high energy
- AI-backed suggestions to support upcoming energy levels based on cycle phase
- Mental health check-ins integrated here (sleep and mental health are directly linked)
- In-app journaling
- Relevant ads: sleep/energy supplements (magnesium), spa services, massage, bubble bath
- Paywall potential: TBD (section acknowledged as underdeveloped by Candice; mental health integration is the main expansion path)

### 3. Nutrition

- Goal: make food tracking as simple as possible — women are already managing too much
- **Photo logging is the primary input method**: user photographs a meal; the app estimates and logs nutritional values. This feature must be free.
  - Do not store photos (reduces cost). A photo review/history option can be a paywall feature.
- Barcode scanning as secondary input
- Phase-aware dietary suggestions: e.g., "You're moving into the luteal phase — consider increasing iron over the next 3 days"
- Paywalled features: in-app recipes and meal planning coordinated with her upcoming dietary requirements
- Relevant ads: grocery/meal delivery (Instacart, HelloFresh), iron supplements (HemeBoost), general nutrition supplements

### 4. Physical Wellness

> Candice is not sold on the title "Physical Wellness" — keep this open for refinement.

- Goal-based workout suggestions that meet the user where her body currently is
- Modified exercises based on joint health and current pain/injury (asked during onboarding and updated over time)
- Native OS health platform integration: Apple Health (HealthKit), Fitbit
  - Step counter, activity tracking
- Weight and body measurement tracking
- Progress tracking over time
- Recovery coaching
- Localized class ads: the app surfaces relevant, local fitness classes (Zumba, Yoga, etc.) so users don't have to search — "the classes find them"
- Paywalled "Video Vault" (workout video library)
- Relevant ads: topical ointments (Rub A535), tensor bandages, foam rollers, local studios

---

## Advertising Strategy

Ads should be **intuitive and anticipatory**, not last-minute. The goal is to surface the right product at the right moment in her cycle before she's in need — not after. Ad placement must feel like a natural part of the health guidance, not an intrusion. Each quadrant has its own category of relevant ads (see above).

---

## Business Model

| Feature | Free | Paywall |
|---|---|---|
| Core quadrant tracking | Yes | — |
| Photo nutrition logging | Yes | — |
| AI phase-aware suggestions | Yes | — |
| Photo history/review | — | Plus |
| Recipes & meal planning | — | Plus / Premium |
| Video Vault (workouts) | — | Premium |
| Advanced mental health tools | TBD | TBD |

RevenueCat manages entitlements (`plus`, `premium`). Premium subsumes Plus.

---

## Medical Guidance Philosophy

**PhasePlate is not a diagnostic tool.** Candice and Ian are not doctors. The app must never diagnose.

However, the app *should* flag when a user should consult a physician. The mechanism:

- **Trigger condition**: a specific symptom is logged three or more times in a specific menstrual phase (Infradian Logic)
- **Alert copy style**: "Infradian Logic Observation: We've noticed a consistent variance in your [Data Point] during your current phase. This may be worth discussing with your physician. Would you like a summary of your recent logs to show them?"
- **Physician Summary Export**: a PDF or CSV formatted for a doctor visit:
  - Objective raw log data only (no interpretation)
  - Disclaimer header: *"This report is a user-generated log from the PhasePlate Hub. It is intended to assist a healthcare provider in clinical assessment and is not a diagnostic report."*
  - Suggested labs section: e.g., Vitamin D, Full Iron Panel, TSH — based on which logic flags triggered

This feature also serves as **founder legal protection** — the app empowers, observes, and refers; it never diagnoses.

---

## Legal / Consent (In-App)

The consent wall must be a linear, unbypassable UI flow:

1. User must scroll to the bottom of the legal text before the Accept button becomes active ("Forced Scroll")
2. Two separate checkboxes: one for General Terms, one for Confidentiality
   - The dual checkbox is a deliberate "psychological speed bump" — the user must acknowledge the confidential nature of the project twice
3. No way to bypass the legal wall and reach app content

This design brings the consent flow to 100% legal defensibility (the draft was assessed at 92% without forced scroll and dual checkboxes).

---

## Logo & Brand Evolution

The current logo is intentionally simple — appropriate for pre-alpha. The logo will evolve and become more detailed as development matures. Where possible, the UI should reflect the current logo state so both grow together.

---

## Technical Philosophy

### AI and Computation
- Use **deterministic, science-based formulas** (cheap/free) for cycle phase math and nutritional estimates wherever possible. Reserve LLM/generative AI calls for features that genuinely require them (e.g., photo food analysis, natural language suggestions).
- OpenAI photo analysis: ~$0.005–$0.01 per call. Keep within monthly budget cap. Move key to Supabase Edge Function before App Store release.

### Performance & Device Support
- Consider a "Lite Mode" for older devices without a dedicated NPU — offload heavy computation to server rather than burning battery
- Monitor for thermal throttling: if the device heats up, simplify animations automatically
- Prefer **delta-syncing** over re-sending full data packages on UI updates
- Kill server connections when the app goes to background (no warm standby)
- Target a high local-to-cloud ratio to keep the free tier sustainable

### Sustainability
- Aspiration to report "water-per-session" environmental impact from cloud fallback — be transparent about data center usage

### Privacy
- Do not store nutrition photos (reduces cost and privacy surface)
- Photo history as an opt-in paywall feature only

---

## Open Questions / Unresolved

- Final name for the "Physical Wellness" quadrant
- Paywall structure for the Sleep/Energy section
- Whether mental health journaling lives inside Sleep/Energy or as a standalone section
- Exact NPU detection and Lite Mode implementation
- Environmental impact reporting implementation
