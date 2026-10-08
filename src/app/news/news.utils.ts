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
