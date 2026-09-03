export interface SurveyDeadlineInfo {
  deadline?: number | null;
  isArchived?: boolean;
}

export type SurveyDeadlineValue = Date | string | number | null | undefined;

const toLocalDate = (value: Date | string | number): Date | null => {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  // A date only string is parsed as UTC, which lands on the previous day west of Greenwich
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  const date = dateOnly ?
    new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]) :
    new Date(value);
  return isNaN(date.getTime()) ? null : date;
};

// Deadlines are picked as a day, and that whole day still belongs to the survey, so the stored
// timestamp is the last millisecond of it
export const surveyDeadlineTimestamp = (value: SurveyDeadlineValue): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const date = toLocalDate(value);
  if (date === null) {
    return null;
  }
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

export const surveyDeadlineDate = (deadline: number | null | undefined): Date | null =>
  typeof deadline === 'number' && !isNaN(deadline) ? new Date(deadline) : null;

export const isSurveyDeadlinePassed = (survey: SurveyDeadlineInfo | null | undefined, now = Date.now()): boolean =>
  typeof survey?.deadline === 'number' && survey.deadline < now;

// Archived surveys and surveys past their deadline both stop accepting submissions
export const isSurveyClosed = (survey: SurveyDeadlineInfo | null | undefined, now = Date.now()): boolean =>
  survey?.isArchived === true || isSurveyDeadlinePassed(survey, now);
