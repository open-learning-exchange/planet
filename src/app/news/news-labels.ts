export interface CustomVoiceLabel {
  name: string;
  color?: string;
}

export const DEFAULT_VOICE_LABELS: readonly string[] = [ 'help', 'offer', 'advice' ];
export const SHARED_CHAT_LABEL = 'shared chat';
export const DEFAULT_LABEL_COLOR = '#bbdefb';

export const LABEL_TINT_COLORS: readonly string[] = [
  '#bbdefb', // Blue (Default)
  '#c8e6c9', // Green
  '#ffecb3', // Amber
  '#ffcdd2', // Coral / Red
  '#e1bee7', // Purple
  '#b2dfdb', // Teal
  '#b2ebf2', // Cyan
  '#ffe0b2', // Orange
  '#f8bbd0'  // Pink
];

export const getVoiceLabelName = (label: unknown): string =>
  typeof label === 'string' ? label : (label as any)?.name || '';

export const normalizeVoiceLabel = (label: unknown): string =>
  getVoiceLabelName(label).toLowerCase();

export const voiceLabelsEqual = (firstLabel: unknown, secondLabel: unknown): boolean => {
  const normFirst = normalizeVoiceLabel(firstLabel);
  const normSecond = normalizeVoiceLabel(secondLabel);
  return Boolean(normFirst && normSecond && normFirst === normSecond);
};

export const normalizeCustomVoiceLabel = (label: unknown): CustomVoiceLabel | null => {
  const name = getVoiceLabelName(label).trim();
  if (!name) {
    return null;
  }
  return { name, color: (label as any)?.color || DEFAULT_LABEL_COLOR };
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

export const getVoiceLabelColor = (label: unknown, customLabels: unknown[] = []): string => {
  const directColor = (label as any)?.color;
  if (directColor) {
    return directColor;
  }
  const match = (customLabels || []).find(custom => voiceLabelsEqual(custom, label));
  return (match as any)?.color || DEFAULT_LABEL_COLOR;
};
