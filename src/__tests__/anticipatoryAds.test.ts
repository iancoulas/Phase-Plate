import { calculateCyclePhase } from '../utils/cycleCalculator';
import { getActiveAd } from '../utils/anticipatoryAds';

const BASE_DATE = new Date('2024-01-01');
const CYCLE_PARAMS = { lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5 };

function daysAfter(n: number): Date {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + n);
  return d;
}

function phaseOn(dayOfCycle: number) {
  // dayOfCycle 1 == BASE_DATE itself (daysAfter(0))
  return calculateCyclePhase({ ...CYCLE_PARAMS, currentDate: daysAfter(dayOfCycle - 1) });
}

describe('getActiveAd — menstruation quadrant (anticipates menstrual, from luteal)', () => {
  it('is active 2 days before menstrual begins (day 26 of 28)', () => {
    const phase = phaseOn(26);
    expect(phase.phase).toBe('luteal');
    expect(phase.daysUntilNextPhase).toBe(2);
    expect(getActiveAd('menstruation', phase)?.id).toBe('menstruation-pain-relief');
  });

  it('is not active 3 days before (outside the anticipation window)', () => {
    const phase = phaseOn(25);
    expect(phase.daysUntilNextPhase).toBe(3);
    expect(getActiveAd('menstruation', phase)).toBeNull();
  });

  it('is not active during the menstrual phase itself (VISION.md: before, not during)', () => {
    const phase = phaseOn(1);
    expect(phase.phase).toBe('menstrual');
    expect(getActiveAd('menstruation', phase)).toBeNull();
  });
});

describe('getActiveAd — sleep quadrant (anticipates luteal, from ovulatory)', () => {
  it('is active 2 days before luteal begins (last day of ovulatory)', () => {
    const phase = phaseOn(15);
    expect(phase.phase).toBe('ovulatory');
    expect(phase.daysUntilNextPhase).toBeLessThanOrEqual(2);
    expect(getActiveAd('sleep', phase)?.targetPhase).toBe('luteal');
  });

  it('is not active once already in luteal', () => {
    const phase = phaseOn(16);
    expect(phase.phase).toBe('luteal');
    expect(getActiveAd('sleep', phase)).toBeNull();
  });
});

describe('getActiveAd — no match', () => {
  it('returns null for a quadrant/phase combination with no matching ad', () => {
    const phase = phaseOn(8); // follicular, no ads anticipate follicular
    expect(getActiveAd('menstruation', phase)).toBeNull();
    expect(getActiveAd('sleep', phase)).toBeNull();
    expect(getActiveAd('nutrition', phase)).toBeNull();
    expect(getActiveAd('physical', phase)).toBeNull();
  });
});
