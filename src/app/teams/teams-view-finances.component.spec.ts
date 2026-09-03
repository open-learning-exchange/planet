import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { LOCALE_ID } from '@angular/core';
import { vi } from 'vitest';
import { TeamsViewFinancesComponent } from './teams-view-finances.component';
import { CsvService } from '../shared/csv.service';
import { CouchService } from '../shared/couchdb.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsTablePdfExportService } from './teams-table-pdf-export.service';
import { StateService } from '../shared/state.service';
import { TeamsService } from './teams.service';
import { TeamsAttachmentsService } from './teams-attachments.service';

describe('TeamsViewFinancesComponent', () => {
  let component: TeamsViewFinancesComponent;
  let fixture: ComponentFixture<TeamsViewFinancesComponent>;
  let csvService: CsvService;

  const mockFinances = [
    {
      _id: 'tx-1',
      date: new Date('2026-07-01T10:00:00Z').getTime(),
      description: 'Initial Deposit',
      type: 'credit',
      amount: 1000,
      status: 'active'
    },
    {
      _id: 'tx-2',
      date: new Date('2026-07-05T10:00:00Z').getTime(),
      description: 'Hardware Supplies',
      type: 'debit',
      amount: 250,
      status: 'active'
    },
    {
      _id: 'tx-3',
      date: new Date('2026-07-10T10:00:00Z').getTime(),
      description: 'Grant Funding',
      type: 'credit',
      amount: 500,
      status: 'active'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        BrowserAnimationsModule,
        TeamsViewFinancesComponent
      ],
      providers: [
        CsvService,
        CouchService,
        DialogsFormService,
        DialogsLoadingService,
        PlanetMessageService,
        TeamsTablePdfExportService,
        StateService,
        TeamsService,
        TeamsAttachmentsService,
        provideNativeDateAdapter(),
        { provide: LOCALE_ID, useValue: 'en' },
        provideHttpClient(withInterceptorsFromDi())
      ]
    });

    csvService = TestBed.inject(CsvService);
    fixture = TestBed.createComponent(TeamsViewFinancesComponent);
    component = fixture.componentInstance;
    component.finances = mockFinances;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  it('should create TeamsViewFinancesComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should bind MatSort to the table data source', () => {
    expect(component.table.sort).toBeTruthy();
  });

  it('should render sort headers only for date, credit, and debit', () => {
    const sortHeaders = fixture.debugElement.queryAll(By.css('mat-header-cell[mat-sort-header]'));
    const sortHeaderIds = sortHeaders.map(sh => sh.attributes['mat-sort-header']);

    expect(sortHeaderIds).toContain('date');
    expect(sortHeaderIds).toContain('credit');
    expect(sortHeaderIds).toContain('debit');
    expect(sortHeaderIds).not.toContain('description');
    expect(sortHeaderIds).not.toContain('balance');
  });

  it('should sort date correctly via sortingDataAccessor for both timestamps and Date objects', () => {
    const item1 = { date: 100, credit: 50, debit: 0 };
    const item2 = { date: new Date('2026-07-10T10:00:00Z'), credit: 10, debit: 0 };
    const emptyItem = { credit: 10 };

    expect(component.table.sortingDataAccessor(item1, 'date')).toBe(100);
    expect(component.table.sortingDataAccessor(item2, 'date')).toBe(new Date('2026-07-10T10:00:00Z').getTime());
    expect(component.table.sortingDataAccessor(emptyItem, 'date')).toBe(0);
  });

  it('should sort credit and debit numbers correctly via sortingDataAccessor', () => {
    const creditItem = { date: 100, credit: 500, debit: 0 };
    const debitItem = { date: 100, credit: 0, debit: 150 };
    const emptyItem = { date: 100 };

    expect(component.table.sortingDataAccessor(creditItem, 'credit')).toBe(500);
    expect(component.table.sortingDataAccessor(emptyItem, 'credit')).toBe(0);

    expect(component.table.sortingDataAccessor(debitItem, 'debit')).toBe(150);
    expect(component.table.sortingDataAccessor(emptyItem, 'debit')).toBe(0);
  });

  it('should export CSV using current sorted table order', () => {
    const exportCsvSpy = vi.spyOn(csvService, 'exportCSV').mockImplementation(() => {});
    component.exportTableData();

    expect(exportCsvSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.any(Array),
        title: expect.stringContaining('Financial Transactions')
      })
    );
  });
});
