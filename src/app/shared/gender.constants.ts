import { styleVariables } from './utils';

export type GenderValue = 'male' | 'female' | 'other' | 'preferNotToSay';
export type ReportGenderValue = GenderValue | 'didNotSpecify';

export interface GenderOption {
  value: GenderValue;
  label: string;
  icon?: string | null;
}

export interface ReportGenderOption {
  value: ReportGenderValue;
  label: string;
  color: string;
}

export const genderOptions: GenderOption[] = [
  { value: 'male', label: $localize`Male`, icon: 'male' },
  { value: 'female', label: $localize`Female`, icon: 'female' },
  { value: 'other', label: $localize`Other`, icon: null },
  { value: 'preferNotToSay', label: $localize`Prefer not to say`, icon: null }
];

export const reportGenderOptions: ReportGenderOption[] = [
  { value: 'male', label: $localize`Male`, color: styleVariables.primaryLighter },
  { value: 'female', label: $localize`Female`, color: styleVariables.accentLighter },
  { value: 'other', label: $localize`Other`, color: '#c8e6c9' },
  { value: 'preferNotToSay', label: $localize`Prefer not to say`, color: '#d1c4e9' },
  { value: 'didNotSpecify', label: $localize`Did not specify`, color: styleVariables.grey }
];

const genderOptionValues = new Set(genderOptions.map(({ value }) => value));

export const normalizeGender = (gender?: string | null): ReportGenderValue => {
  return gender && genderOptionValues.has(gender as GenderValue) ? gender as GenderValue : 'didNotSpecify';
};

export const createGenderCounts = (): Record<ReportGenderValue, number> => ({
  male: 0,
  female: 0,
  other: 0,
  preferNotToSay: 0,
  didNotSpecify: 0
});

export const getGenderIcon = (gender?: string | null): string | null => {
  const normalizedGender = normalizeGender(gender);
  if (normalizedGender === 'didNotSpecify' || normalizedGender === 'preferNotToSay' || normalizedGender === 'other') {
    return null;
  }
  return normalizedGender;
};

export const getGenderLabel = (gender?: string | null, { fallback = 'N/A' }: { fallback?: string } = {}): string => {
  if (!gender) {
    return fallback;
  }
  return reportGenderOptions.find((genderOption) => genderOption.value === normalizeGender(gender))?.label || fallback;
};
