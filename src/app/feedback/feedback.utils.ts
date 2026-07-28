export const FEEDBACK_TYPE_OPTIONS = [
  { label: $localize`Question`, value: 'question' },
  { label: $localize`Bug`, value: 'bug' },
  { label: $localize`Suggestion`, value: 'suggestion' }
] as const;

export const FEEDBACK_PRIORITY_OPTIONS = [
  { label: $localize`Yes`, value: 'yes' },
  { label: $localize`No`, value: 'no' }
] as const;

export const FEEDBACK_STATUS_OPTIONS = [
  { label: $localize`Open`, value: 'open' },
  { label: $localize`Reopened`, value: 'reopened' },
  { label: $localize`Closed`, value: 'closed' }
] as const;

interface FeedbackOption { label: string; value: string }

export interface FeedbackTitleContext {
  kind: 'home' | 'section' | 'item' | 'path';
  state?: string;
  name?: string;
  path?: string[];
}

const normalizeFeedbackValue = (value: unknown, allowedValues: readonly string[], fallback: string) => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();
  return allowedValues.includes(normalizedValue) ? normalizedValue : fallback;
};

const getLabelFromOptions = (value: string, options: readonly FeedbackOption[]) => {
  return options.find(option => option.value === value)?.label || value;
};

export const normalizeFeedbackType = (value: unknown) =>
  normalizeFeedbackValue(value, FEEDBACK_TYPE_OPTIONS.map(option => option.value), 'question');

export const normalizeFeedbackPriority = (value: unknown) =>
  normalizeFeedbackValue(value, FEEDBACK_PRIORITY_OPTIONS.map(option => option.value), 'no');

export const normalizeFeedbackStatus = (value: unknown) =>
  normalizeFeedbackValue(value, FEEDBACK_STATUS_OPTIONS.map(option => option.value), 'open');

export const getFeedbackTypeLabel = (value: unknown) => getLabelFromOptions(normalizeFeedbackType(value), FEEDBACK_TYPE_OPTIONS);

export const getFeedbackPriorityLabel = (value: unknown) =>
  getLabelFromOptions(normalizeFeedbackPriority(value), FEEDBACK_PRIORITY_OPTIONS);

export const getFeedbackStatusLabel = (value: unknown) => getLabelFromOptions(normalizeFeedbackStatus(value), FEEDBACK_STATUS_OPTIONS);

export const getFeedbackTypeIcon = (value: unknown) => {
  switch (normalizeFeedbackType(value)) {
    case 'bug':
      return 'bug_report';
    case 'question':
      return 'help_outline';
    case 'suggestion':
      return 'speaker_notes';
    default:
      return '';
  }
};

export const getFeedbackDisplayTitle = (feedback: { title?: string; titleContext?: FeedbackTitleContext; type?: string; url?: string }) => {
  // Keep explicit (manually edited) titles untouched. Older auto-generated titles also remain as saved;
  if (feedback.title?.trim()) {
    return feedback.title;
  }

  const { titleContext } = feedback;
  if (!titleContext) {
    return feedback.url ? $localize`Feedback regarding ${feedback.url}` : '';
  }

  switch (titleContext.kind) {
    case 'home':
      return $localize`Feedback regarding home`;
    case 'section':
      return $localize`Feedback regarding ${titleContext.state || ''}`;
    case 'item':
      return $localize`Feedback regarding ${titleContext.state || ''}/${titleContext.name || ''}`;
    case 'path':
      return $localize`Feedback regarding ${titleContext.path?.join('/') || ''}`;
    default:
      return '';
  }
};
