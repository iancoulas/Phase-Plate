export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type ContraceptionType =
  | 'none'
  | 'hormonal_pill'
  | 'hormonal_iud'
  | 'implant'
  | 'injection'
  | 'copper_iud'
  | 'barrier'
  | 'fertility_awareness'
  | 'abstinence';

const HORMONAL_TYPES: ContraceptionType[] = [
  'hormonal_pill',
  'hormonal_iud',
  'implant',
  'injection',
];

export function isHormonalContraception(contraception?: ContraceptionType): boolean {
  return HORMONAL_TYPES.includes(contraception ?? 'none');
}

export interface CyclePhaseResult {
  phase: CyclePhase;
  dayOfCycle: number;
  daysUntilNextPhase: number;
  nextPeriodDate: Date;
  description: string;
  nutritionTips: string[];
}

const PHASE_CONTENT: Record<
  CyclePhase,
  { description: string; nutritionTips: string[] }
> = {
  menstrual: {
    description:
      'Your period has arrived. Hormone levels are at their lowest. Rest and gentle movement support recovery.',
    nutritionTips: [
      'Iron-rich foods (leafy greens, red meat) help replenish lost iron.',
      'Magnesium (dark chocolate, nuts) may ease cramps.',
      'Stay well-hydrated to reduce bloating.',
      'Omega-3 fatty acids (salmon, walnuts) have anti-inflammatory properties.',
    ],
  },
  follicular: {
    description:
      'Oestrogen rises as follicles develop. Energy and mood begin to lift — a great time to start new projects.',
    nutritionTips: [
      'Phytoestrogens (flaxseed, soy) support rising oestrogen.',
      'Fermented foods (yogurt, kefir) boost gut health.',
      'Complex carbohydrates sustain energy for increasing activity.',
      'Zinc (pumpkin seeds, chickpeas) supports follicle development.',
    ],
  },
  ovulatory: {
    description:
      'Peak oestrogen triggers ovulation. You may feel your most energetic and social right now.',
    nutritionTips: [
      'Antioxidants (berries, colourful veg) protect the egg.',
      'Fibre helps the body metabolise excess oestrogen.',
      'Vitamin C (citrus, peppers) supports ovarian function.',
      'Light, easily digestible meals suit heightened metabolism.',
    ],
  },
  luteal: {
    description:
      'Progesterone rises after ovulation. Body temperature increases slightly; some may notice PMS symptoms.',
    nutritionTips: [
      'Magnesium (dark leafy greens, bananas) reduces PMS symptoms.',
      'B6 (poultry, potatoes) supports progesterone metabolism.',
      'Calcium (dairy, fortified plant milk) eases mood changes.',
      'Reduce caffeine and alcohol to minimise bloating and anxiety.',
    ],
  },
};

export function calculateCyclePhase(params: {
  lastPeriodDate: Date;
  cycleLength?: number;
  periodLength?: number;
  contraception?: ContraceptionType;
  currentDate?: Date;
}): CyclePhaseResult {
  const {
    lastPeriodDate,
    cycleLength = 28,
    periodLength = 5,
    contraception = 'none',
    currentDate = new Date(),
  } = params;

  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);

  const start = new Date(lastPeriodDate);
  start.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const dayOfCycle = (diffDays % cycleLength) + 1;

  const nextPeriodDate = new Date(start);
  const cyclesElapsed = Math.floor(diffDays / cycleLength) + 1;
  nextPeriodDate.setDate(start.getDate() + cyclesElapsed * cycleLength);

  const ovulationDay = cycleLength - 14;
  const isHormonal = isHormonalContraception(contraception);

  let phase: CyclePhase;
  let lastDayOfPhase: number;

  if (dayOfCycle <= periodLength) {
    phase = 'menstrual';
    lastDayOfPhase = periodLength;
  } else if (isHormonal) {
    if (dayOfCycle <= ovulationDay) {
      phase = 'follicular';
      lastDayOfPhase = ovulationDay;
    } else {
      phase = 'luteal';
      lastDayOfPhase = cycleLength;
    }
  } else {
    const ovulatoryStart = ovulationDay - 1;
    const ovulatoryEnd = ovulationDay + 1;

    if (dayOfCycle < ovulatoryStart) {
      phase = 'follicular';
      lastDayOfPhase = ovulatoryStart - 1;
    } else if (dayOfCycle <= ovulatoryEnd) {
      phase = 'ovulatory';
      lastDayOfPhase = ovulatoryEnd;
    } else {
      phase = 'luteal';
      lastDayOfPhase = cycleLength;
    }
  }

  const daysUntilNextPhase = lastDayOfPhase - dayOfCycle;
  const { description, nutritionTips } = PHASE_CONTENT[phase];

  return {
    phase,
    dayOfCycle,
    daysUntilNextPhase,
    nextPeriodDate,
    description,
    nutritionTips,
  };
}
