export const DEFAULT_VOICE_LABELS: readonly string[] = [ 'help', 'offer', 'advice' ];
export const SHARED_CHAT_LABEL = 'shared chat';

export const normalizeVoiceLabel = (label: unknown) => typeof label === 'string' ? label.toLowerCase() : '';

export const voiceLabelsEqual = (firstLabel: unknown, secondLabel: unknown) =>
  typeof firstLabel === 'string' && typeof secondLabel === 'string' &&
  normalizeVoiceLabel(firstLabel) === normalizeVoiceLabel(secondLabel);

export const dedupeVoiceLabels = (labels: unknown[]): string[] => {
  const seenLabels = new Set<string>();
  return labels.filter((label): label is string => {
    if (typeof label !== 'string') {
      return false;
    }
    const normalizedLabel = normalizeVoiceLabel(label);
    if (seenLabels.has(normalizedLabel)) {
      return false;
    }
    seenLabels.add(normalizedLabel);
    return true;
  });
};
