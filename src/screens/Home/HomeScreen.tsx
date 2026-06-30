import React, { useMemo } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCycle } from '../../contexts/CycleContext';
import { calculateCyclePhase } from '../../utils/cycleCalculator';
import { RootTabParamList } from '../../types';

const { width } = Dimensions.get('window');
const PLATE_SIZE = Math.min(width - 48, 340);
const CX = PLATE_SIZE / 2;
const CY = PLATE_SIZE / 2;
const OUTER_R = PLATE_SIZE / 2 - 4;
const INNER_R = 44;

type Nav = BottomTabNavigationProp<RootTabParamList>;

type QuadrantDef = {
  screen: keyof RootTabParamList;
  label: string;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  startDeg: number;
  endDeg: number;
};

// Clockwise from top-right:
//   Cycle     270–360  (top-right)
//   Nutrition   0–90   (bottom-right)
//   Sleep      90–180  (bottom-left)  ← was Physical
//   Physical  180–270  (top-left)     ← was Profile
const QUADRANTS: QuadrantDef[] = [
  { screen: 'Menstruation', label: 'Cycle',     color: '#8B3A5A', icon: 'calendar',  startDeg: 270, endDeg: 360 },
  { screen: 'Nutrition',    label: 'Nutrition', color: '#6B5A2D', icon: 'nutrition', startDeg: 0,   endDeg: 90  },
  { screen: 'Sleep',        label: 'Sleep',     color: '#2C5364', icon: 'moon',      startDeg: 90,  endDeg: 180 },
  { screen: 'Physical',     label: 'Physical',  color: '#2D4A6B', icon: 'body',      startDeg: 180, endDeg: 270 },
];

const PHASE_LABELS: Record<string, string> = {
  menstrual:  'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulatory:  'Ovulatory Phase',
  luteal:     'Luteal Phase',
};

const PHASE_COLORS: Record<string, string> = {
  menstrual:  '#8B3A5A',
  follicular: '#D4A5C9',
  ovulatory:  '#C0392B',
  luteal:     '#7D5A8A',
};

function toXY(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slicePath(startDeg: number, endDeg: number): string {
  const s1 = toXY(INNER_R, startDeg);
  const s2 = toXY(OUTER_R, startDeg);
  const e2 = toXY(OUTER_R, endDeg);
  const e1 = toXY(INNER_R, endDeg);
  return [
    `M ${s1.x} ${s1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 0 1 ${e2.x} ${e2.y}`,
    `L ${e1.x} ${e1.y}`,
    `A ${INNER_R} ${INNER_R} 0 0 0 ${s1.x} ${s1.y}`,
    'Z',
  ].join(' ');
}

function iconPos(startDeg: number, endDeg: number) {
  const mid = startDeg + (endDeg - startDeg) / 2;
  const r = (OUTER_R + INNER_R) / 2 + 4;
  return toXY(r, mid);
}

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { lastPeriodDate, cycleLength, periodLength, loading } = useCycle();

  const cyclePhase = useMemo(() => {
    if (loading) return null;
    try {
      return calculateCyclePhase({ lastPeriodDate, cycleLength, periodLength, contraception: 'none' });
    } catch {
      return null;
    }
  }, [lastPeriodDate, cycleLength, periodLength, loading]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{greeting}</Text>
          {cyclePhase ? (
            <View style={[styles.phaseBadge, { backgroundColor: PHASE_COLORS[cyclePhase.phase] ?? '#9B59B6' }]}>
              <Text style={styles.phaseBadgeText}>
                {PHASE_LABELS[cyclePhase.phase] ?? cyclePhase.phase} · Day {cyclePhase.dayOfCycle}
              </Text>
            </View>
          ) : (
            <Text style={styles.setupHint}>Log your first period to see your phase</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-circle-outline" size={34} color="#8B3A5A" />
        </TouchableOpacity>
      </View>

      <View style={styles.plateWrapper}>
        <Svg width={PLATE_SIZE} height={PLATE_SIZE}>
          <Circle cx={CX} cy={CY} r={OUTER_R + 3} fill="rgba(0,0,0,0.06)" />
          {QUADRANTS.map((q) => (
            <Path
              key={q.screen}
              d={slicePath(q.startDeg, q.endDeg)}
              fill={q.color}
              onPress={() => navigation.navigate(q.screen)}
            />
          ))}
          {/* Straight dividers at 0°/90°/180°/270° — drawn from inner ring to outer ring */}
          <Line x1={CX}           y1={CY - OUTER_R} x2={CX}           y2={CY - INNER_R} stroke="#F5EDE8" strokeWidth={2} />
          <Line x1={CX + INNER_R} y1={CY}           x2={CX + OUTER_R} y2={CY}           stroke="#F5EDE8" strokeWidth={2} />
          <Line x1={CX}           y1={CY + INNER_R} x2={CX}           y2={CY + OUTER_R} stroke="#F5EDE8" strokeWidth={2} />
          <Line x1={CX - OUTER_R} y1={CY}           x2={CX - INNER_R} y2={CY}           stroke="#F5EDE8" strokeWidth={2} />
          <Circle cx={CX} cy={CY} r={INNER_R} fill="#F5EDE8" />
        </Svg>

        {QUADRANTS.map((q) => {
          const pos = iconPos(q.startDeg, q.endDeg);
          return (
            <TouchableOpacity
              key={q.screen}
              style={[styles.quadrantOverlay, { left: pos.x - 32, top: pos.y - 32 }]}
              onPress={() => navigation.navigate(q.screen)}
              activeOpacity={0.7}
            >
              <Ionicons name={q.icon} size={26} color="#fff" />
              <Text style={styles.quadrantLabel}>{q.label}</Text>
            </TouchableOpacity>
          );
        })}

      </View>

      <Text style={styles.tapHint}>Tap a section to get started</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE8',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    gap: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  phaseBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  setupHint: {
    fontSize: 14,
    color: '#999',
  },
  profileBtn: {
    marginTop: 2,
    padding: 4,
  },
  plateWrapper: {
    width: PLATE_SIZE,
    height: PLATE_SIZE,
    position: 'relative',
  },
  quadrantOverlay: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  quadrantLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tapHint: {
    marginTop: 28,
    fontSize: 13,
    color: '#bbb',
  },
});
