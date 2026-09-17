import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { By } from '@angular/platform-browser';
import { MatSortHeader } from '@angular/material/sort';
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
  let pdfExportService: TeamsTablePdfExportService;
  let dialogsLoadingService: DialogsLoadingService;

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
    pdfExportService = TestBed.inject(TeamsTablePdfExportService);
    dialogsLoadingService = TestBed.inject(DialogsLoadingService);
    fixture = TestBed.createComponent(TeamsViewFinancesComponent);
    component = fixture.componentInstance;
    component.finances = mockFinances;
    component.ngOnChanges();
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sortBy = (id: string, start: 'asc' | 'desc') => {
    component.table.sort.sort({ id, start, disableClear: true });
    fixture.detectChanges();
  };

  const exportedDescriptions = (exportOptions: any) => exportOptions.data.map((row: any) => row['description']);

  const renderedDescriptions = () => fixture.debugElement.queryAll(By.css('.km-description'))
    .map(cell => cell.nativeElement.textContent.trim());

  it('should create TeamsViewFinancesComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should bind MatSort to the table data source', () => {
    expect(component.table.sort).toBeTruthy();
  });

  it('should render sort headers only for date, credit, and debit', () => {
    const sortHeaderIds = fixture.debugElement.queryAll(By.directive(MatSortHeader))
      .map(header => header.injector.get(MatSortHeader).id);

    expect(sortHeaderIds).toEqual([ 'date', 'credit', 'debit' ]);
  });

  it('should start sorted by date descending', () => {
    expect(component.table.sort.active).toBe('date');
    expect(component.table.sort.direction).toBe('desc');
  });

  it('should export CSV using current sorted table order', () => {
    const exportCsvSpy = vi.spyOn(csvService, 'exportCSV').mockImplementation(() => {});
    sortBy('credit', 'asc');
    component.exportTableData();

    expect(exportCsvSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining('Financial Transactions') })
    );
    expect(exportedDescriptions(exportCsvSpy.mock.calls[0][0]))
      .toEqual([ 'Hardware Supplies', 'Grant Funding', 'Initial Deposit' ]);
  });

  it('should export PDF using current sorted table order', () => {
    const exportPdfSpy = vi.spyOn(pdfExportService, 'exportTable').mockImplementation(() => {});
    vi.spyOn(dialogsLoadingService, 'start').mockImplementation(() => {});
    vi.spyOn(dialogsLoadingService, 'stop').mockImplementation(() => {});
    sortBy('credit', 'desc');
    component.exportTablePdf();

    expect(exportedDescriptions(exportPdfSpy.mock.calls[0][0]))
      .toEqual([ 'Initial Deposit', 'Grant Funding', 'Hardware Supplies' ]);
  });

  it('should keep the active sort when a date filter empties the table', () => {
    sortBy('credit', 'asc');
    expect(renderedDescriptions()).toEqual([ 'Hardware Supplies', 'Grant Funding', 'Initial Deposit' ]);

    component.startDate = new Date('2027-01-01T00:00:00Z');
    component.transactionFilter();
    fixture.detectChanges();
    expect(component.emptyTable).toBe(true);

    component.resetDateFilter();
    fixture.detectChanges();

    expect(component.table.sort.active).toBe('credit');
    expect(component.table.sort.direction).toBe('asc');
    expect(renderedDescriptions()).toEqual([ 'Hardware Supplies', 'Grant Funding', 'Initial Deposit' ]);
  });

  it('should not reorder the table data source when exporting', () => {
    vi.spyOn(csvService, 'exportCSV').mockImplementation(() => {});
    sortBy('credit', 'asc');
    component.exportTableData();

    expect(component.table.data.map(row => row.description))
      .toEqual([ 'Grant Funding', 'Hardware Supplies', 'Initial Deposit' ]);
  });
});
