import { styleVariables } from './utils';

export type GenderValue = 'male' | 'female' | 'other';
export type ReportGenderValue = GenderValue | 'didNotSpecify';

export interface GenderOption {
  value: GenderValue;
  label: string;
  icon?: string | null;
  iconClass?: string;
}

export interface ReportGenderOption {
  value: ReportGenderValue;
  label: string;
  color: string;
}

export const genderOptions: GenderOption[] = [
  { value: 'male', label: $localize`Male`, icon: 'male', iconClass: 'primary-text-color' },
  { value: 'female', label: $localize`Female`, icon: 'female', iconClass: 'accent-text-color' },
  { value: 'other', label: $localize`Other`, icon: 'other' }
];

export const reportGenderOptions: ReportGenderOption[] = [
  { value: 'male', label: $localize`Male`, color: styleVariables.primaryLighter },
  { value: 'female', label: $localize`Female`, color: styleVariables.accentLighter },
  { value: 'other', label: $localize`Other`, color: styleVariables.greenLighter },
  { value: 'didNotSpecify', label: $localize`Did not specify`, color: styleVariables.grey }
];

const genderOptionValues = new Set(genderOptions.map(({ value }) => value));

export const normalizeGender = (gender?: string | null): ReportGenderValue => {
  const normalizedGender = gender?.trim().toLowerCase() as GenderValue | undefined;
  return normalizedGender && genderOptionValues.has(normalizedGender) ? normalizedGender : 'didNotSpecify';
};

export const createGenderCounts = (): Record<ReportGenderValue, number> =>
  reportGenderOptions.reduce((counts, { value }) => {
    counts[value] = 0;
    return counts;
  }, {} as Record<ReportGenderValue, number>);

export const getGenderIcon = (gender?: string | null): string | null => {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === 'didNotSpecify') {
    return null;
  }
  return normalizedGender;
};

export const getGenderLabel = (
  gender?: string | null,
  { fallback = $localize`N/A` }: { fallback?: string } = {}
): string => {
  if (!gender) {
    return fallback;
  }
  const normalizedGender = normalizeGender(gender);
  return reportGenderOptions.find((genderOption) => genderOption.value === normalizedGender)?.label || fallback;
};
