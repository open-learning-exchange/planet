import { isChartableQuestion, questionChartFromAggregate } from './submissions-charts';

describe('submissions charts', () => {

  describe('isChartableQuestion', () => {

    it('accepts choice and rating scale questions', () => {
      expect(isChartableQuestion({ type: 'select' })).toBe(true);
      expect(isChartableQuestion({ type: 'selectMultiple' })).toBe(true);
      expect(isChartableQuestion({ type: 'ratingScale' })).toBe(true);
    });

    it('rejects free text questions and missing questions', () => {
      expect(isChartableQuestion({ type: 'input' })).toBe(false);
      expect(isChartableQuestion({ type: 'textarea' })).toBe(false);
      expect(isChartableQuestion(undefined)).toBe(false);
    });

  });

  describe('questionChartFromAggregate', () => {

    const aggregate = (overrides = {}) => ({
      labels: [ 'A', 'B' ], data: [ 1, 2 ], userCounts: [ 1, 2 ], totalUsers: 3, totalSelections: 3,
      chartType: 'pie', isRatingScale: false, ...overrides
    });

    it('renders single-choice questions as a pie with one color per slice', () => {
      const chart = questionChartFromAggregate(aggregate(), { type: 'select' }, 0);

      expect(chart.type).toBe('pie');
      expect((chart.datasets[0].backgroundColor as string[]).length).toBe(2);
    });

    it('renders rating scales as a bar chart', () => {
      const chart = questionChartFromAggregate(
        aggregate({ chartType: 'bar', isRatingScale: true }), { type: 'ratingScale' }, 1
      );

      expect(chart.type).toBe('bar');
      expect(chart.title).toBe('Question 2');
    });

    it('footnotes multi-select questions because percentages can exceed 100', () => {
      const chart = questionChartFromAggregate(aggregate({ chartType: 'bar' }), { type: 'selectMultiple' }, 0);

      expect(chart.footnote).toBeTruthy();
    });

    it('leaves single-choice questions without a footnote', () => {
      expect(questionChartFromAggregate(aggregate(), { type: 'select' }, 0).footnote).toBe('');
    });

    it('carries the respondent total through from the aggregate', () => {
      expect(questionChartFromAggregate(aggregate(), { type: 'select' }, 0).totalRespondents).toBe(3);
    });

  });

});
