export interface OnboardingProfile {
  contraception:
    | 'none'
    | 'hormonal_pill'
    | 'hormonal_iud'
    | 'implant'
    | 'injection'
    | 'copper_iud'
    | 'barrier'
    | 'fertility_awareness'
    | 'abstinence'
    | null;
  menopause: 'premenopausal' | 'perimenopause' | 'postmenopause' | 'not_applicable' | null;
  postpartum:
    | 'not_postpartum'
    | 'under_6_weeks'
    | '6_weeks_to_3_months'
    | '3_to_12_months'
    | 'over_12_months'
    | null;
  birthType: 'vaginal' | 'caesarean' | null;
  nursing: 'exclusively' | 'mixed' | 'not_nursing' | null;
  conditions: string[];
  thyroid: 'no_condition' | 'hypothyroid' | 'hyperthyroid' | 'hashimotos' | 'other' | null;
  medications: string;
  workType: 'desk' | 'active' | 'shift' | 'variable' | null;
  goals: string[];
}
