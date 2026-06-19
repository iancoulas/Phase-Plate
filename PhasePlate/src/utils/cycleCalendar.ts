import { calculateCyclePhase, CyclePhase, ContraceptionType } from './cycleCalculator';

export interface PhaseColors {
  background: string;
  text: string;
  dot: string;
  swatch: string;
}

export const PHASE_COLORS: Record<CyclePhase, PhaseColors> = {
  menstrual: {
    background: '#FFE4E4',
    text: '#C0392B',
    dot: '#E74C3C',
    swatch: '#E74C3C',
  },
  follicular: {
    background: '#E8F5E9',
    text: '#27AE60',
    dot: '#2ECC71',
    swatch: '#2ECC71',
  },
  ovulatory: {
    background: '#FFF9E6',
    text: '#F39C12',
    dot: '#F1C40F',
    swatch: '#F1C40F',
  },
  luteal: {
    background: '#EDE7F6',
    text: '#6C3483',
    dot: '#9B59B6',
    swatch: '#9B59B6',
  },
};

export interface DayMarking {
  customStyles?: {
    container?: {
      backgroundColor?: string;
      borderWidth?: number;
      borderColor?: string;
      borderRadius?: number;
    };
    text?: {
      color?: string;
      fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    };
  };
  dots?: Array<{ key: string; color: string; selectedColor?: string }>;
  marked?: boolean;
}

export function generateMarkedDates(
  year: number,
  month: number,
  params: {
    lastPeriodDate: Date;
    cycleLength?: number;
    periodLength?: number;
    contraception?: ContraceptionType;
  }
): Record<string, DayMarking> {
  const marked: Record<string, DayMarking> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      const result = calculateCyclePhase({ ...params, currentDate: date });
      const colors = PHASE_COLORS[result.phase];
      const isToday = date.getTime() === today.getTime();

      marked[dateStr] = {
        customStyles: {
          container: {
            backgroundColor: colors.background,
            ...(isToday && {
              borderWidth: 2,
              borderColor: colors.dot,
              borderRadius: 16,
            }),
          },
          text: {
            color: colors.text,
            fontWeight: isToday ? 'bold' : 'normal',
          },
        },
        ...(result.phase === 'menstrual' && {
          dots: [{ key: 'menstrual', color: colors.dot }],
          marked: true,
        }),
      };
    } catch {
      // Skip days before lastPeriodDate
    }
  }

  return marked;
}
