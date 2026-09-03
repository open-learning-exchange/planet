import {
  isSurveyClosed, isSurveyDeadlinePassed, surveyDeadlineDate, surveyDeadlineTimestamp
} from './survey-deadline.helpers';

describe('survey deadline helpers', () => {

  describe('surveyDeadlineTimestamp', () => {

    it('keeps the whole picked day open by ending it at midnight', () => {
      const deadline = surveyDeadlineTimestamp(new Date(2026, 8, 10, 9, 30));

      expect(deadline).toBe(new Date(2026, 8, 10, 23, 59, 59, 999).getTime());
    });

    it('reads a date only string as that local day rather than a UTC instant', () => {
      expect(surveyDeadlineTimestamp('2026-09-10')).toBe(new Date(2026, 8, 10, 23, 59, 59, 999).getTime());
    });

    it('keeps a stored deadline on its own day when it is edited again', () => {
      const stored = new Date(2026, 8, 10, 23, 59, 59, 999).getTime();

      expect(surveyDeadlineTimestamp(stored)).toBe(stored);
    });

    it('has no deadline for the values a cleared field can hold', () => {
      expect(surveyDeadlineTimestamp(null)).toBeNull();
      expect(surveyDeadlineTimestamp(undefined)).toBeNull();
      expect(surveyDeadlineTimestamp('')).toBeNull();
      expect(surveyDeadlineTimestamp('not a date')).toBeNull();
    });

  });

  describe('surveyDeadlineDate', () => {

    it('turns a stored deadline back into a date the picker can show', () => {
      const stored = new Date(2026, 8, 10, 23, 59, 59, 999).getTime();

      expect(surveyDeadlineDate(stored)).toEqual(new Date(stored));
      expect(surveyDeadlineDate(null)).toBeNull();
      expect(surveyDeadlineDate(undefined)).toBeNull();
    });

  });

  describe('isSurveyDeadlinePassed', () => {

    it('accepts submissions until the deadline is behind us', () => {
      const now = new Date(2026, 8, 10, 12, 0).getTime();
      const deadline = new Date(2026, 8, 10, 23, 59, 59, 999).getTime();

      expect(isSurveyDeadlinePassed({ deadline }, now)).toBe(false);
      expect(isSurveyDeadlinePassed({ deadline }, deadline)).toBe(false);
      expect(isSurveyDeadlinePassed({ deadline }, deadline + 1)).toBe(true);
    });

    it('leaves surveys without a deadline open', () => {
      expect(isSurveyDeadlinePassed({})).toBe(false);
      expect(isSurveyDeadlinePassed({ deadline: null })).toBe(false);
      expect(isSurveyDeadlinePassed(null)).toBe(false);
      expect(isSurveyDeadlinePassed(undefined)).toBe(false);
    });

  });

  describe('isSurveyClosed', () => {

    it('closes surveys that are archived or past their deadline', () => {
      const now = new Date(2026, 8, 10, 12, 0).getTime();

      expect(isSurveyClosed({ isArchived: true }, now)).toBe(true);
      expect(isSurveyClosed({ deadline: new Date(2026, 8, 9, 23, 59, 59, 999).getTime() }, now)).toBe(true);
      expect(isSurveyClosed({ deadline: new Date(2026, 8, 11, 23, 59, 59, 999).getTime() }, now)).toBe(false);
      expect(isSurveyClosed({}, now)).toBe(false);
    });

  });

});
