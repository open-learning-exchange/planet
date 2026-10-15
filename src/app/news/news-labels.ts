export interface CustomVoiceLabel {
  name: string;
  color: string;
}

export const DEFAULT_VOICE_LABELS: readonly string[] = [ 'help', 'offer', 'advice' ];
export const SHARED_CHAT_LABEL = 'shared chat';
export const DEFAULT_LABEL_COLOR = 'default';

// Keys must match $label-colors in _variables.scss
export const LABEL_COLORS = [
  { key: DEFAULT_LABEL_COLOR, name: $localize`Default` },
  { key: 'green', name: $localize`Green` },
  { key: 'teal', name: $localize`Teal` },
  { key: 'purple', name: $localize`Purple` },
  { key: 'pink', name: $localize`Pink` },
  { key: 'lime', name: $localize`Lime` },
  { key: 'brown', name: $localize`Brown` }
];

export const getVoiceLabelName = (label: unknown): string =>
  typeof label === 'string' ? label : typeof (label as any)?.name === 'string' ? (label as any).name : '';

export const normalizeVoiceLabel = (label: unknown): string => getVoiceLabelName(label).toLowerCase();

export const voiceLabelsEqual = (firstLabel: unknown, secondLabel: unknown): boolean => {
  const normFirst = normalizeVoiceLabel(firstLabel);
  const normSecond = normalizeVoiceLabel(secondLabel);
  return Boolean(normFirst && normSecond && normFirst === normSecond);
};

const normalizeCustomVoiceLabel = (label: unknown): CustomVoiceLabel | null => {
  const name = getVoiceLabelName(label).trim();
  if (!name) {
    return null;
  }
  const color = (label as any)?.color;
  return { name, color: LABEL_COLORS.some(({ key }) => key === color) ? color : DEFAULT_LABEL_COLOR };
};

export const dedupeVoiceLabels = (labels: unknown[]): string[] => {
  const seenLabels = new Set<string>();
  return (labels || [])
    .map(getVoiceLabelName)
    .filter(name => {
      const normalized = name.toLowerCase();
      if (!normalized || seenLabels.has(normalized)) {
        return false;
      }
      seenLabels.add(normalized);
      return true;
    });
};

export const dedupeCustomVoiceLabels = (labels: unknown[]): CustomVoiceLabel[] => {
  const seenLabels = new Set<string>();
  return (labels || [])
    .map(normalizeCustomVoiceLabel)
    .filter((label): label is CustomVoiceLabel => {
      const normalized = label?.name.toLowerCase();
      if (!normalized || seenLabels.has(normalized)) {
        return false;
      }
      seenLabels.add(normalized);
      return true;
    });
};

export const labelColorClass = (color = DEFAULT_LABEL_COLOR) => `label-color-${color}`;
