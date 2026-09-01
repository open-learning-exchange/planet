import { vi } from 'vitest';
import { StateService } from '../shared/state.service';
import { TeamsAttachmentsService } from './teams-attachments.service';
import { TeamsReportsComponent } from './teams-reports.component';

describe('TeamsReportsComponent', () => {
  let component: TeamsReportsComponent;

  const report = (overrides: any = {}) => ({
    startDate: Date.UTC(2026, 0, 1),
    endDate: Date.UTC(2026, 0, 31),
    beginningBalance: 0,
    sales: 100,
    otherIncome: 0,
    wages: 40,
    otherExpenses: 0,
    ...overrides
  });

  beforeEach(() => {
    component = new TeamsReportsComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { receiptAttachments: () => [] } as any as TeamsAttachmentsService,
      {} as any,
      {} as any,
      { configuration: { currency: {} } } as any as StateService,
      {} as any,
      'en-US'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('filtering', () => {
    beforeEach(() => {
      component.reports = [
        report({ _id: 'a', label: 'Q1 Audit' }),
        report({ _id: 'b', label: 'annual review' }),
        report({ _id: 'c' }),
        report({ _id: 'd', label: 'Archived Label', status: 'archived' })
      ];
      component.ngOnChanges();
    });

    it('shows every unarchived report when no filter is set', () => {
      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a', 'b', 'c' ]);
    });

    it('matches a label regardless of case', () => {
      component.applyFilter('q1 AUDIT');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a' ]);
    });

    it('matches the formatted date range so unlabelled reports stay findable', () => {
      component.applyFilter('Jan 31, 2026');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a', 'b', 'c' ]);
    });

    it('matches nothing when the search is absent from labels and dates', () => {
      component.applyFilter('payroll');

      expect(component.filteredCards).toEqual([]);
    });

    it('ignores surrounding whitespace in the search', () => {
      component.applyFilter('  annual  ');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'b' ]);
    });

    it('reapplies the active filter when the reports reload', () => {
      component.applyFilter('Q1');
      component.reports = [ ...component.reports, report({ _id: 'e', label: 'Q1 Follow-up' }) ];
      component.ngOnChanges();

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a', 'e' ]);
    });
  });

  describe('label suggestions', () => {
    it('lists the labels already in use, deduplicated and sorted', () => {
      component.reports = [
        report({ label: 'Quarterly' }),
        report({ label: 'Annual' }),
        report({ label: 'Quarterly' })
      ];
      component.ngOnChanges();

      expect(component['reportLabels']()).toEqual([ 'Annual', 'Quarterly' ]);
    });

    it('omits reports with no usable label', () => {
      component.reports = [ report({ label: '  ' }), report({}), report({ label: ' Audit ' }) ];
      component.ngOnChanges();

      expect(component['reportLabels']()).toEqual([ 'Audit' ]);
    });
  });
});
