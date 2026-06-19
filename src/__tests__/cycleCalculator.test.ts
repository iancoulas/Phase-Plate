import { calculateCyclePhase } from '../utils/cycleCalculator';

const BASE_DATE = new Date('2024-01-01');

function daysAfter(n: number): Date {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + n);
  return d;
}

describe('Menstrual phase', () => {
  it('Day 1 — dayOfCycle=1, phase=menstrual', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: BASE_DATE });
    expect(r.phase).toBe('menstrual');
    expect(r.dayOfCycle).toBe(1);
    expect(r.daysUntilNextPhase).toBe(4);
  });

  it('Day 5 — last day of menstrual phase', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(4) });
    expect(r.phase).toBe('menstrual');
    expect(r.dayOfCycle).toBe(5);
    expect(r.daysUntilNextPhase).toBe(0);
  });
});

describe('Follicular phase', () => {
  it('Day 6 — first day of follicular', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(5) });
    expect(r.phase).toBe('follicular');
    expect(r.dayOfCycle).toBe(6);
  });

  it('Day 12 — last day of follicular (0 remaining)', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(11) });
    expect(r.phase).toBe('follicular');
    expect(r.dayOfCycle).toBe(12);
    expect(r.daysUntilNextPhase).toBe(0);
  });
});

describe('Ovulatory phase', () => {
  it('Day 13 — ovulatory, 2 remaining', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(12) });
    expect(r.phase).toBe('ovulatory');
    expect(r.dayOfCycle).toBe(13);
    expect(r.daysUntilNextPhase).toBe(2);
  });

  it('Day 14 — ovulatory, 1 remaining', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(13) });
    expect(r.phase).toBe('ovulatory');
    expect(r.dayOfCycle).toBe(14);
    expect(r.daysUntilNextPhase).toBe(1);
  });

  it('Day 15 — ovulatory, 0 remaining', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(14) });
    expect(r.phase).toBe('ovulatory');
    expect(r.dayOfCycle).toBe(15);
    expect(r.daysUntilNextPhase).toBe(0);
  });
});

describe('Luteal phase', () => {
  it('Day 16 — luteal, 12 remaining', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(15) });
    expect(r.phase).toBe('luteal');
    expect(r.dayOfCycle).toBe(16);
    expect(r.daysUntilNextPhase).toBe(12);
  });

  it('Day 28 — last day of luteal', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(27) });
    expect(r.phase).toBe('luteal');
    expect(r.dayOfCycle).toBe(28);
    expect(r.daysUntilNextPhase).toBe(0);
  });
});

describe('Cycle wrap-around', () => {
  it('Day 29 resets to dayOfCycle 1', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(28) });
    expect(r.dayOfCycle).toBe(1);
    expect(r.phase).toBe('menstrual');
  });
});

describe('nextPeriodDate', () => {
  it('is exactly cycleLength days ahead of last period', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, currentDate: BASE_DATE });
    const expected = new Date(BASE_DATE);
    expected.setDate(expected.getDate() + 28);
    expect(r.nextPeriodDate.toDateString()).toBe(expected.toDateString());
  });
});

describe('Hormonal suppression', () => {
  it('hormonal_pill on day 14 → follicular (no ovulatory)', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, contraception: 'hormonal_pill', currentDate: daysAfter(13) });
    expect(r.phase).toBe('follicular');
  });

  it('hormonal_iud on day 14 → follicular', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, contraception: 'hormonal_iud', currentDate: daysAfter(13) });
    expect(r.phase).toBe('follicular');
  });

  it('implant on day 14 → follicular', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, contraception: 'implant', currentDate: daysAfter(13) });
    expect(r.phase).toBe('follicular');
  });

  it('injection on day 14 → follicular', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, contraception: 'injection', currentDate: daysAfter(13) });
    expect(r.phase).toBe('follicular');
  });
});

describe('Non-hormonal natural cycles', () => {
  it('copper_iud on day 14 → ovulatory', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, contraception: 'copper_iud', currentDate: daysAfter(13) });
    expect(r.phase).toBe('ovulatory');
  });

  it('barrier on day 14 → ovulatory', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, contraception: 'barrier', currentDate: daysAfter(13) });
    expect(r.phase).toBe('ovulatory');
  });
});

describe('Cycle lengths', () => {
  it('21-day cycle: ovulation day 7', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 21, periodLength: 5, currentDate: daysAfter(6) });
    expect(r.phase).toBe('ovulatory');
  });

  it('35-day cycle: ovulation day 21', () => {
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 35, periodLength: 5, currentDate: daysAfter(20) });
    expect(r.phase).toBe('ovulatory');
  });
});

describe('Content integrity', () => {
  const phases = ['menstrual', 'follicular', 'ovulatory', 'luteal'] as const;

  it.each(phases)('%s phase has non-empty description and ≥2 nutrition tips', (phase) => {
    const dayMap = { menstrual: 0, follicular: 5, ovulatory: 13, luteal: 15 };
    const r = calculateCyclePhase({ lastPeriodDate: BASE_DATE, cycleLength: 28, periodLength: 5, currentDate: daysAfter(dayMap[phase]) });
    expect(r.phase).toBe(phase);
    expect(r.description.length).toBeGreaterThan(0);
    expect(r.nutritionTips.length).toBeGreaterThanOrEqual(2);
  });
});
