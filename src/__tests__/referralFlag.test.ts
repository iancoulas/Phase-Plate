import { detectReferralFlags } from '../utils/referralFlag';
import { MenstruationLog } from '../services/supabase';

const BASE_DATE = new Date('2024-01-01');
const CYCLE_PARAMS = { lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5 };

function isoDate(n: number): string {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function log(dayOfCycle: number, overrides: Partial<MenstruationLog> = {}): MenstruationLog {
  return { log_date: isoDate(dayOfCycle), ...overrides };
}

describe('detectReferralFlags', () => {
  it('flags severe cramps logged 3+ times in the current (luteal) phase', () => {
    // Days 20, 48, 76 are all day-20-of-cycle (luteal, cycle length 28) across three cycles.
    const logs = [
      log(19, { cramp_level: 4 }),
      log(47, { cramp_level: 5 }),
      log(75, { cramp_level: 4 }),
    ];
    const flags = detectReferralFlags(logs, CYCLE_PARAMS, 'luteal');
    expect(flags).toHaveLength(1);
    expect(flags[0].symptomType).toBe('cramp');
    expect(flags[0].count).toBe(3);
    expect(flags[0].suggestedLabs).toContain('Vitamin D');
  });

  it('does not flag when a symptom occurs fewer than 3 times', () => {
    const logs = [log(19, { cramp_level: 5 }), log(47, { cramp_level: 5 })];
    const flags = detectReferralFlags(logs, CYCLE_PARAMS, 'luteal');
    expect(flags).toHaveLength(0);
  });

  it('does not count symptoms logged in a different phase', () => {
    // Days 1, 2, 3 are menstrual, not luteal.
    const logs = [
      log(0, { cramp_level: 5 }),
      log(1, { cramp_level: 5 }),
      log(2, { cramp_level: 5 }),
    ];
    const flags = detectReferralFlags(logs, CYCLE_PARAMS, 'luteal');
    expect(flags).toHaveLength(0);
  });

  it('flags multiple symptom types independently', () => {
    const logs = [
      log(19, { cramp_level: 5, mood: 'terrible', flow_level: 'heavy' }),
      log(47, { cramp_level: 5, mood: 'bad', flow_level: 'very_heavy' }),
      log(75, { cramp_level: 5, mood: 'terrible', flow_level: 'heavy' }),
    ];
    const flags = detectReferralFlags(logs, CYCLE_PARAMS, 'luteal');
    const types = flags.map(f => f.symptomType).sort();
    expect(types).toEqual(['cramp', 'flow', 'mood']);
  });

  it('mild symptoms below threshold severity are not counted', () => {
    const logs = [
      log(19, { cramp_level: 2, mood: 'okay', flow_level: 'light' }),
      log(47, { cramp_level: 2, mood: 'good', flow_level: 'medium' }),
      log(75, { cramp_level: 3, mood: 'great', flow_level: 'medium' }),
    ];
    const flags = detectReferralFlags(logs, CYCLE_PARAMS, 'luteal');
    expect(flags).toHaveLength(0);
  });
});
