import { CyclePhase, CyclePhaseResult, ContraceptionType, isHormonalContraception } from './cycleCalculator';

export type AdQuadrant = 'menstruation' | 'sleep' | 'nutrition' | 'physical';

export interface AdContent {
  id: string;
  quadrant: AdQuadrant;
  category: string;
  title: string;
  body: string;
  /** The phase in which the need actually arises. */
  targetPhase: CyclePhase;
  /** Show this ad starting this many days before targetPhase begins. */
  anticipationDays: number;
}

// House/placeholder ad content per VISION.md's Advertising Strategy — no real ad
// network is wired up yet (no account exists). This is the anticipatory-timing
// engine; swap AD_CONTENT for real sponsored placements once that's set up.
const AD_CONTENT: AdContent[] = [
  {
    id: 'menstruation-pain-relief',
    quadrant: 'menstruation',
    category: 'Pain relief',
    title: 'Cramps coming up',
    body: 'Stock up on pain relief before your period arrives — Midol, Tylenol, or Advil.',
    targetPhase: 'menstrual',
    anticipationDays: 2,
  },
  {
    id: 'menstruation-period-products',
    quadrant: 'menstruation',
    category: 'Period products',
    title: 'Restock period products',
    body: 'Pads, tampons, cups, or period underwear — worth checking your supply now.',
    targetPhase: 'menstrual',
    anticipationDays: 2,
  },
  {
    id: 'sleep-supplements',
    quadrant: 'sleep',
    category: 'Sleep & energy supplements',
    title: 'Support your sleep',
    body: 'Magnesium and other sleep aids can help as you head into your luteal phase.',
    targetPhase: 'luteal',
    anticipationDays: 2,
  },
  {
    id: 'sleep-spa',
    quadrant: 'sleep',
    category: 'Spa & relaxation',
    title: 'Time to unwind',
    body: 'A massage or a bubble bath can ease the transition into your luteal phase.',
    targetPhase: 'luteal',
    anticipationDays: 2,
  },
  {
    id: 'nutrition-iron',
    quadrant: 'nutrition',
    category: 'Iron & nutrition supplements',
    title: 'Iron matters soon',
    body: 'Your luteal phase is coming up — consider an iron or general nutrition supplement.',
    targetPhase: 'luteal',
    anticipationDays: 3,
  },
  {
    id: 'nutrition-grocery',
    quadrant: 'nutrition',
    category: 'Grocery & meal delivery',
    title: 'Plan your meals ahead',
    body: 'A grocery or meal-delivery order now can make the next few days easier.',
    targetPhase: 'luteal',
    anticipationDays: 3,
  },
  {
    id: 'physical-recovery',
    quadrant: 'physical',
    category: 'Recovery & topical relief',
    title: 'Ease into recovery',
    body: 'Topical ointments, tensor bandages, or a foam roller can help as cramps approach.',
    targetPhase: 'menstrual',
    anticipationDays: 2,
  },
];

/** The phase that immediately precedes targetPhase in the cycle sequence. */
function getPrecedingPhase(targetPhase: CyclePhase, isHormonal: boolean): CyclePhase {
  switch (targetPhase) {
    case 'menstrual': return 'luteal';
    case 'follicular': return 'menstrual';
    case 'ovulatory': return 'follicular';
    case 'luteal': return isHormonal ? 'follicular' : 'ovulatory';
  }
}

/**
 * Returns the first ad for the given quadrant whose target phase's need is
 * anticipated by the current phase — i.e. we're in the preceding phase and
 * within its anticipation window. Returns null outside that window (VISION.md
 * is explicit: anticipate before the need, not during).
 */
export function getActiveAd(
  quadrant: AdQuadrant,
  currentPhase: CyclePhaseResult,
  contraception?: ContraceptionType
): AdContent | null {
  const isHormonal = isHormonalContraception(contraception);
  const candidates = AD_CONTENT.filter(ad => ad.quadrant === quadrant);

  for (const ad of candidates) {
    const precedingPhase = getPrecedingPhase(ad.targetPhase, isHormonal);
    if (currentPhase.phase === precedingPhase && currentPhase.daysUntilNextPhase <= ad.anticipationDays) {
      return ad;
    }
  }
  return null;
}
