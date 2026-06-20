import React, { useRef, useState, useCallback } from 'react';
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { saveOnboardingProfile } from '../../services/supabase';
import { OnboardingProfile } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 8;

const BLANK: OnboardingProfile = {
  contraception: null,
  menopause: null,
  postpartum: null,
  birthType: null,
  nursing: null,
  conditions: [],
  thyroid: null,
  medications: '',
  workType: null,
  goals: [],
};

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>(BLANK);
  const [saving, setSaving] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goTo = useCallback((next: number) => {
    const dir = next > step ? -1 : 1;
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: dir * SCREEN_WIDTH, duration: 0, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
    ]).start();
    setStep(next);
  }, [step, slideAnim]);

  const isStepValid = useCallback(() => {
    switch (step) {
      case 0: return profile.contraception !== null;
      case 1: return profile.menopause !== null;
      case 2:
        if (!profile.postpartum) return false;
        if (profile.postpartum !== 'not_postpartum') return profile.birthType !== null && profile.nursing !== null;
        return true;
      case 3: return profile.conditions.length > 0;
      case 4: return profile.thyroid !== null;
      case 5: return true;
      case 6: return profile.workType !== null;
      case 7: return profile.goals.length > 0;
      default: return false;
    }
  }, [step, profile]);

  const handleFinish = useCallback(async () => {
    setSaving(true);
    await saveOnboardingProfile(profile as unknown as Record<string, unknown>);
    setSaving(false);
    onComplete();
  }, [profile, onComplete]);

  function setField<K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) {
    setProfile(p => ({ ...p, [key]: value }));
  }

  function toggleMulti(key: 'conditions' | 'goals', value: string) {
    setProfile(p => {
      const arr = p[key] as string[];
      if (key === 'conditions') {
        if (value === 'none') return { ...p, conditions: ['none'] };
        const filtered = arr.filter(v => v !== 'none');
        return { ...p, conditions: filtered.includes(value) ? filtered.filter(v => v !== value) : [...filtered, value] };
      }
      return { ...p, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Contraception</Text>
            <Text style={styles.stepSub}>What contraception do you currently use?</Text>
            <View style={styles.chips}>
              {([
                ['none', 'None'],
                ['hormonal_pill', 'Hormonal Pill'],
                ['hormonal_iud', 'Hormonal IUD'],
                ['implant', 'Implant'],
                ['injection', 'Injection'],
                ['copper_iud', 'Copper IUD'],
                ['barrier', 'Barrier'],
                ['fertility_awareness', 'Fertility Awareness'],
                ['abstinence', 'Abstinence'],
              ] as const).map(([val, label]) => (
                <Chip key={val} label={label} selected={profile.contraception === val} onPress={() => setField('contraception', val)} />
              ))}
            </View>
          </View>
        );
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Menopause Stage</Text>
            <Text style={styles.stepSub}>Where are you in your menopause journey?</Text>
            <View style={styles.chips}>
              {([
                ['premenopausal', 'Premenopausal'],
                ['perimenopause', 'Perimenopause'],
                ['postmenopause', 'Postmenopause'],
                ['not_applicable', 'Not applicable'],
              ] as const).map(([val, label]) => (
                <Chip key={val} label={label} selected={profile.menopause === val} onPress={() => setField('menopause', val)} />
              ))}
            </View>
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Postpartum</Text>
            <Text style={styles.stepSub}>Have you given birth recently?</Text>
            <View style={styles.chips}>
              {([
                ['not_postpartum', 'Not postpartum'],
                ['under_6_weeks', 'Under 6 weeks'],
                ['6_weeks_to_3_months', '6 weeks – 3 months'],
                ['3_to_12_months', '3–12 months'],
                ['over_12_months', 'Over 12 months ago'],
              ] as const).map(([val, label]) => (
                <Chip key={val} label={label} selected={profile.postpartum === val} onPress={() => setField('postpartum', val)} />
              ))}
            </View>
            {profile.postpartum && profile.postpartum !== 'not_postpartum' && (
              <>
                <Text style={[styles.stepSub, { marginTop: 16 }]}>Birth type</Text>
                <View style={styles.chips}>
                  {([['vaginal', 'Vaginal'], ['caesarean', 'Caesarean']] as const).map(([val, label]) => (
                    <Chip key={val} label={label} selected={profile.birthType === val} onPress={() => setField('birthType', val)} />
                  ))}
                </View>
                <Text style={[styles.stepSub, { marginTop: 12 }]}>Nursing</Text>
                <View style={styles.chips}>
                  {([
                    ['exclusively', 'Exclusively breastfeeding'],
                    ['mixed', 'Mixed feeding'],
                    ['not_nursing', 'Not nursing'],
                  ] as const).map(([val, label]) => (
                    <Chip key={val} label={label} selected={profile.nursing === val} onPress={() => setField('nursing', val)} />
                  ))}
                </View>
              </>
            )}
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Menstrual Conditions</Text>
            <Text style={styles.stepSub}>Select all that apply</Text>
            <View style={styles.chips}>
              {['None', 'Endometriosis', 'PCOS', 'Fibroids', 'Adenomyosis', 'Heavy periods', 'Irregular cycles', 'Painful periods'].map(c => {
                const val = c.toLowerCase().replace(/ /g, '_');
                return (
                  <Chip key={val} label={c} selected={profile.conditions.includes(val)} onPress={() => toggleMulti('conditions', val)} />
                );
              })}
            </View>
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Thyroid</Text>
            <Text style={styles.stepSub}>Do you have a thyroid condition?</Text>
            <View style={styles.chips}>
              {([
                ['no_condition', 'No condition'],
                ['hypothyroid', 'Hypothyroidism'],
                ['hyperthyroid', 'Hyperthyroidism'],
                ['hashimotos', "Hashimoto's"],
                ['other', 'Other'],
              ] as const).map(([val, label]) => (
                <Chip key={val} label={label} selected={profile.thyroid === val} onPress={() => setField('thyroid', val)} />
              ))}
            </View>
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>Medications</Text>
            <Text style={styles.stepSub}>List any relevant medications (optional)</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={5}
              value={profile.medications}
              onChangeText={v => setField('medications', v)}
              placeholder="e.g. Levothyroxine 50mcg, Metformin…"
            />
          </View>
        );
      case 6:
        return (
          <View>
            <Text style={styles.stepTitle}>Work Type</Text>
            <Text style={styles.stepSub}>What best describes your daily activity level?</Text>
            <View style={styles.chips}>
              {([
                ['desk', 'Desk / Sedentary'],
                ['active', 'Physically Active'],
                ['shift', 'Shift Work'],
                ['variable', 'Variable'],
              ] as const).map(([val, label]) => (
                <Chip key={val} label={label} selected={profile.workType === val} onPress={() => setField('workType', val)} />
              ))}
            </View>
          </View>
        );
      case 7:
        return (
          <View>
            <Text style={styles.stepTitle}>Your Goals</Text>
            <Text style={styles.stepSub}>Select all that apply</Text>
            <View style={styles.chips}>
              {[
                ['track_cycle', 'Track my cycle'],
                ['improve_nutrition', 'Improve nutrition'],
                ['manage_symptoms', 'Manage symptoms'],
                ['understand_hormones', 'Understand hormones'],
                ['lose_weight', 'Lose weight'],
                ['build_strength', 'Build strength'],
                ['improve_sleep', 'Improve sleep'],
                ['fertility', 'Support fertility'],
              ].map(([val, label]) => (
                <Chip key={val} label={label} selected={profile.goals.includes(val)} onPress={() => toggleMulti('goals', val)} />
              ))}
            </View>
          </View>
        );
      default:
        return null;
    }
  }

  const progress = (step + 1) / TOTAL_STEPS;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => goTo(step - 1)}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !isStepValid() && styles.nextBtnDisabled]}
            onPress={step < TOTAL_STEPS - 1 ? () => goTo(step + 1) : handleFinish}
            disabled={!isStepValid() || saving}
          >
            <Text style={styles.nextBtnText}>{saving ? 'Saving…' : step < TOTAL_STEPS - 1 ? 'Continue' : 'Finish'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  progressTrack: { height: 4, backgroundColor: '#f0f0f0' },
  progressFill: { height: 4, backgroundColor: '#9B59B6' },
  scroll: { padding: 24 },
  stepTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  stepSub: { fontSize: 15, color: '#666', marginBottom: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fafafa' },
  chipSelected: { borderColor: '#9B59B6', backgroundColor: '#EDE7F6' },
  chipText: { fontSize: 14, color: '#444' },
  chipTextSelected: { color: '#6C3483', fontWeight: '600' },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 15, minHeight: 120, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', gap: 12, padding: 20 },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  backBtnText: { fontSize: 16, color: '#666', fontWeight: '500' },
  nextBtn: { flex: 2, backgroundColor: '#9B59B6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
