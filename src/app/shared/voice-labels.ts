export const DEFAULT_VOICE_LABELS: readonly string[] = [ 'help', 'offer', 'advice' ];
export const SHARED_CHAT_LABEL = 'shared chat';

export const normalizeVoiceLabel = (label: string) => label.toLowerCase();

export const voiceLabelsEqual = (firstLabel: string, secondLabel: string) =>
  normalizeVoiceLabel(firstLabel) === normalizeVoiceLabel(secondLabel);

export const dedupeVoiceLabels = (labels: string[]) => {
  const seenLabels = new Set<string>();
  return labels.filter(label => {
    const normalizedLabel = normalizeVoiceLabel(label);
    if (seenLabels.has(normalizedLabel)) {
      return false;
    }
    seenLabels.add(normalizedLabel);
    return true;
  });
};
