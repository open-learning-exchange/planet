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

export const DEFAULT_VOICE_REACTIONS: readonly string[] = [
  '😀', '❤️', '👍', '😂', '😮', '😢',
  '😅', '😍', '🔥', '👏', '🙏', '😭', '😤', '😎', '🤩', '💀',
  '🤣', '💪', '👀', '🎉', '✨', '💯', '🤔', '✅', '🤯', '🥳'
];

export interface NewsReactions {
  [emoji: string]: string[];
}

export interface ReactionEntry {
  emoji: string;
  count: number;
  users: string[];
}

export const parseReactions = (reactions: any): NewsReactions => {
  if (!reactions) {
    return {};
  }
  if (typeof reactions === 'string') {
    try {
      const parsed = JSON.parse(reactions);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof reactions === 'object' && !Array.isArray(reactions)) {
    return { ...reactions };
  }
  return {};
};

export const hasUserReacted = (reactions: any, emoji: string, userId?: string): boolean => {
  if (!userId) {
    return false;
  }
  const parsed = parseReactions(reactions);
  return Array.isArray(parsed[emoji]) && parsed[emoji].includes(userId);
};

export const toggleNewsReaction = (reactions: any, emoji: string, userId: string): NewsReactions => {
  const current = parseReactions(reactions);
  const updated: NewsReactions = {};

  let userHadThisEmoji = false;
  for (const [ key, users ] of Object.entries(current)) {
    if (Array.isArray(users)) {
      const filtered = users.filter(id => id !== userId);
      if (key === emoji && users.includes(userId)) {
        userHadThisEmoji = true;
      }
      if (filtered.length > 0) {
        updated[key] = filtered;
      }
    }
  }

  if (!userHadThisEmoji) {
    const list = updated[emoji] ? [ ...updated[emoji] ] : [];
    list.push(userId);
    updated[emoji] = list;
  }

  return updated;
};

export const getReactionEntries = (reactions: any): ReactionEntry[] => {
  const parsed = parseReactions(reactions);
  return Object.entries(parsed)
    .filter(([ _, users ]) => Array.isArray(users) && users.length > 0)
    .map(([ emoji, users ]) => ({
      emoji,
      count: users.length,
      users
    }));
};
