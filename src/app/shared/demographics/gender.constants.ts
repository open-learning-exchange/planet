import { styleVariables } from '@shared/utils';

export type GenderValue = 'male' | 'female' | 'other';
export type ReportGenderValue = GenderValue | 'didNotSpecify';

export interface GenderOption {
  value: GenderValue;
  label: string;
  icon: string;
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

export const parseGender = (gender?: unknown): GenderValue | undefined => {
  const parsedGender = typeof gender === 'string' ? gender.trim().toLowerCase() as GenderValue : undefined;
  return parsedGender && genderOptionValues.has(parsedGender) ? parsedGender : undefined;
};

export const normalizeGender = (gender?: unknown): ReportGenderValue => parseGender(gender) ?? 'didNotSpecify';

export const createGenderCounts = (): Record<ReportGenderValue, number> =>
  reportGenderOptions.reduce((counts, { value }) => {
    counts[value] = 0;
    return counts;
  }, {} as Record<ReportGenderValue, number>);

export const getGenderIcon = (gender?: unknown): string | null => parseGender(gender) ?? null;

export const getGenderLabel = (
  gender?: unknown,
  { fallback = $localize`N/A` }: { fallback?: string } = {}
): string => {
  if (typeof gender !== 'string' || !gender.trim()) {
    return fallback;
  }
  const normalizedGender = normalizeGender(gender);
  return reportGenderOptions.find((genderOption) => genderOption.value === normalizedGender)?.label || fallback;
};
