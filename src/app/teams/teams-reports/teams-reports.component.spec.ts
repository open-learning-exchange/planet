import { StateService } from '../../shared/state.service';
import { TeamsAttachmentsService } from '../teams-attachments.service';
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

    it('matches a label regardless of case', () => {
      component.applyFilter('q1 AUDIT');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a' ]);
    });

    it('does not match date strings in label search', () => {
      component.applyFilter('Jan 31, 2026');

      expect(component.filteredCards).toEqual([]);
    });

    it('matches words in any order in the label', () => {
      component.applyFilter('audit q1');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a' ]);
    });

    it('finds labels with misspelled words in any order', () => {
      component.applyFilter('reveiw annual');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'b' ]);
    });

    it('tolerates typos in the label', () => {
      component.applyFilter('audti');

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'a' ]);
    });

    it('does not approximate numeric label codes or years', () => {
      component.applyFilter('Q2 audti');
      expect(component.filteredCards).toEqual([]);

      component.applyFilter('2027');
      expect(component.filteredCards).toEqual([]);
    });

    it('matches nothing when the search is absent from labels and descriptions', () => {
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

    it('filters reports by exact start date', () => {
      component.reports = [
        report({ _id: 'jan', startDate: Date.UTC(2026, 0, 1), endDate: Date.UTC(2026, 0, 31) }),
        report({ _id: 'feb', startDate: Date.UTC(2026, 1, 1), endDate: Date.UTC(2026, 1, 28) }),
        report({ _id: 'mar', startDate: Date.UTC(2026, 2, 1), endDate: Date.UTC(2026, 2, 31) })
      ];
      component.ngOnChanges();

      component.startDate = new Date(Date.UTC(2026, 1, 1));
      component.applyFilters();

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'feb' ]);
    });

    it('filters reports by exact end date', () => {
      component.reports = [
        report({ _id: 'jan', startDate: Date.UTC(2026, 0, 1), endDate: Date.UTC(2026, 0, 31) }),
        report({ _id: 'feb', startDate: Date.UTC(2026, 1, 1), endDate: Date.UTC(2026, 1, 28) }),
        report({ _id: 'mar', startDate: Date.UTC(2026, 2, 1), endDate: Date.UTC(2026, 2, 31) })
      ];
      component.ngOnChanges();

      component.endDate = new Date(Date.UTC(2026, 1, 28));
      component.applyFilters();

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'feb' ]);
    });

    it('filters reports matching both exact start and end dates', () => {
      component.reports = [
        report({ _id: 'jan', startDate: Date.UTC(2026, 0, 1), endDate: Date.UTC(2026, 0, 31) }),
        report({ _id: 'feb', startDate: Date.UTC(2026, 1, 1), endDate: Date.UTC(2026, 1, 28) }),
        report({ _id: 'mar', startDate: Date.UTC(2026, 2, 1), endDate: Date.UTC(2026, 2, 31) })
      ];
      component.ngOnChanges();

      component.startDate = new Date(Date.UTC(2026, 1, 1));
      component.endDate = new Date(Date.UTC(2026, 1, 28));
      component.applyFilters();

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'feb' ]);
    });

    it('combines exact date filters and label search filtering', () => {
      component.reports = [
        report({ _id: 'feb-audit', label: 'Audit', startDate: Date.UTC(2026, 1, 1), endDate: Date.UTC(2026, 1, 28) }),
        report({ _id: 'feb-sales', label: 'Sales', startDate: Date.UTC(2026, 1, 1), endDate: Date.UTC(2026, 1, 28) }),
        report({ _id: 'mar-audit', label: 'Audit', startDate: Date.UTC(2026, 2, 1), endDate: Date.UTC(2026, 2, 31) })
      ];
      component.ngOnChanges();

      component.startDate = new Date(Date.UTC(2026, 1, 1));
      component.endDate = new Date(Date.UTC(2026, 1, 28));
      component.labelFilter = 'Audit';
      component.applyFilters();

      expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'feb-audit' ]);
    });

    it('clears all filters and restores full report list', () => {
      component.reports = [
        report({ _id: 'a', label: 'Q1', startDate: Date.UTC(2026, 0, 1), endDate: Date.UTC(2026, 0, 31) }),
        report({ _id: 'b', label: 'Q2', startDate: Date.UTC(2026, 1, 1), endDate: Date.UTC(2026, 1, 28) })
      ];
      component.ngOnChanges();

      component.startDate = new Date(Date.UTC(2026, 0, 1));
      component.endDate = new Date(Date.UTC(2026, 0, 31));
      component.labelFilter = 'Q1';
      component.applyFilters();

      expect(component.hasActiveFilters).toBe(true);
      expect(component.filteredCards.length).toBe(1);

      component.clearAllFilters();

      expect(component.hasActiveFilters).toBe(false);
      expect(component.startDate).toBeUndefined();
      expect(component.endDate).toBeUndefined();
      expect(component.labelFilter).toBe('');
      expect(component.filteredCards.length).toBe(2);
    });

    it('clears only label search when clearLabelFilter is called', () => {
      component.startDate = new Date(Date.UTC(2026, 0, 1));
      component.labelFilter = 'Q1';
      component.applyFilters();

      component.clearLabelFilter();

      expect(component.labelFilter).toBe('');
      expect(component.startDate).toBeDefined();
    });
  });

  it('lists the latest period first, then the most recently created', () => {
    component.reports = [
      report({ _id: 'old', startDate: Date.UTC(2025, 0, 1), createdDate: 3 }),
      report({ _id: 'first', createdDate: 1 }),
      report({ _id: 'second', createdDate: 2 })
    ];
    component.ngOnChanges();

    expect(component.filteredCards.map(card => card.report._id)).toEqual([ 'second', 'first', 'old' ]);
  });

  describe('export', () => {
    beforeEach(() => {
      component.team = { name: 'Team' };
    });

    it('adds a Label column only when an exported report has a label', () => {
      component.reports = [ report({ _id: 'a' }), report({ _id: 'b' }) ];
      component.ngOnChanges();
      expect(Object.keys(component['reportsExportData']().data[0])).not.toContain('Label');

      component.reports = [ report({ _id: 'a', label: 'Q1' }), report({ _id: 'b' }) ];
      component.ngOnChanges();
      expect(component['reportsExportData']().data.map(row => row.Label)).toEqual([ 'Q1', '' ]);
    });

    it('names the active filter in the export title', () => {
      component.reports = [ report({ label: 'Q1' }) ];
      component.ngOnChanges();
      component.applyFilter(' Q1 ');

      expect(component['reportsExportData']().title).toBe('Financial Summary for Team filtered by Q1');
    });

    it('exports the reports matched by a misspelled label', () => {
      component.reports = [ report({ label: 'Audit' }), report({ label: 'Annual Review' }) ];
      component.ngOnChanges();
      component.applyFilter('audti');

      const { data, title } = component['reportsExportData']();
      expect(data.map(row => row.Label)).toEqual([ 'Audit' ]);
      expect(title).toBe('Financial Summary for Team filtered by audti');
    });
  });

  describe('label suggestions', () => {
    it('lists the labels already in use, deduplicated regardless of case and sorted', () => {
      component.reports = [
        report({ label: 'Quarterly' }),
        report({ label: 'Annual' }),
        report({ label: 'quarterly ' })
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
