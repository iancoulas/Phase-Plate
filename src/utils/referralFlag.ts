import { MenstruationLog } from '../services/supabase';
import { calculateCyclePhase, CyclePhase, ContraceptionType } from './cycleCalculator';

export type SymptomType = 'cramp' | 'mood' | 'flow';

export interface ReferralFlag {
  symptomType: SymptomType;
  label: string;
  count: number;
  suggestedLabs: string[];
  alertMessage: string;
}

const REFERRAL_THRESHOLD = 3;

const SYMPTOM_LABELS: Record<SymptomType, string> = {
  cramp: 'cramp severity',
  mood: 'mood',
  flow: 'flow heaviness',
};

// Mapped per VISION.md's medical guidance philosophy — observational suggestions
// only, never a diagnosis. Kept intentionally narrow (one lab area per symptom).
const SUGGESTED_LABS: Record<SymptomType, string[]> = {
  cramp: ['Vitamin D'],
  mood: ['TSH (Thyroid)'],
  flow: ['Full Iron Panel'],
};

const SYMPTOM_CHECKS: Record<SymptomType, (log: MenstruationLog) => boolean> = {
  cramp: log => (log.cramp_level ?? 0) >= 4,
  mood: log => log.mood === 'bad' || log.mood === 'terrible',
  flow: log => log.flow_level === 'heavy' || log.flow_level === 'very_heavy',
};

export interface CycleParams {
  lastPeriodDate: Date;
  cycleLength: number;
  periodLength: number;
  contraception?: ContraceptionType;
}

/**
 * Counts symptom occurrences that fell within the given phase across all
 * provided logs (not just the current phase window) — this is what makes it
 * an "Infradian Logic" pattern rather than a single-cycle coincidence.
 */
export function detectReferralFlags(
  logs: MenstruationLog[],
  cycleParams: CycleParams,
  currentPhase: CyclePhase
): ReferralFlag[] {
  const counts: Record<SymptomType, number> = { cramp: 0, mood: 0, flow: 0 };

  for (const log of logs) {
    const logDate = new Date(`${log.log_date}T00:00:00`);
    let phase: CyclePhase;
    try {
      phase = calculateCyclePhase({ ...cycleParams, currentDate: logDate }).phase;
    } catch {
      continue;
    }
    if (phase !== currentPhase) continue;

    (Object.keys(SYMPTOM_CHECKS) as SymptomType[]).forEach(type => {
      if (SYMPTOM_CHECKS[type](log)) counts[type] += 1;
    });
  }

  const flags: ReferralFlag[] = [];
  (Object.keys(counts) as SymptomType[]).forEach(type => {
    if (counts[type] >= REFERRAL_THRESHOLD) {
      const label = SYMPTOM_LABELS[type];
      flags.push({
        symptomType: type,
        label,
        count: counts[type],
        suggestedLabs: SUGGESTED_LABS[type],
        alertMessage:
          `Infradian Logic Observation: We've noticed a consistent variance in your ${label} during your ` +
          'current phase. This may be worth discussing with your physician. Would you like a summary of ' +
          'your recent logs to show them?',
      });
    }
  });

  return flags;
}
