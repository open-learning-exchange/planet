import { TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ReportsCsvPreviewComponent } from './reports-csv-preview.component';
import { CsvService } from '../../shared/csv.service';

describe('ReportsCsvPreviewComponent', () => {
  const key = 'planet-csv-preview-spec';
  let csvService: { exportFormattedCSV: ReturnType<typeof vi.fn> };

  const createComponent = (queryParams: Record<string, string> = { key }) => new ReportsCsvPreviewComponent(
    { snapshot: { queryParams } } as any,
    csvService as any
  );

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    csvService = { exportFormattedCSV: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the published report and clears it from storage', () => {
    window.localStorage.setItem(key, JSON.stringify({
      title: 'Resource Views',
      columns: [ 'Title', 'Views' ],
      rows: [ { Title: 'Ada', Views: '2' } ],
      truncated: false,
      createdOn: Date.now()
    }));
    const component = createComponent();

    component.ngOnInit();
    vi.advanceTimersByTime(300);

    expect(component.isLoading).toBe(false);
    expect(component.title).toBe('Resource Views');
    expect(component.columns).toEqual([ 'Title', 'Views' ]);
    expect(component.dataSource.data).toEqual([ { Title: 'Ada', Views: '2' } ]);
    expect(component.rowCount).toBe(1);
    expect(window.localStorage.getItem(key)).toBeNull();
    component.ngOnDestroy();
  });

  it('keeps waiting until the report is published', () => {
    const component = createComponent();

    component.ngOnInit();
    vi.advanceTimersByTime(1000);
    expect(component.isLoading).toBe(true);

    window.localStorage.setItem(key, JSON.stringify({
      title: 'Summary', columns: [ 'Section' ], rows: [ { Section: 'Total' } ], truncated: false, createdOn: Date.now()
    }));
    vi.advanceTimersByTime(300);

    expect(component.isLoading).toBe(false);
    expect(component.title).toBe('Summary');
    component.ngOnDestroy();
  });

  it('gives up when no report arrives', () => {
    const component = createComponent();

    component.ngOnInit();
    vi.advanceTimersByTime(61 * 1000);

    expect(component.isLoading).toBe(false);
    expect(component.loadError).toBe(true);
    component.ngOnDestroy();
  });

  it('fails immediately without a preview key', () => {
    const component = createComponent({});

    component.ngOnInit();

    expect(component.loadError).toBe(true);
  });

  it('downloads the previewed rows', () => {
    const component = createComponent();
    component.title = 'Resource Views';
    component.dataSource.data = [ { Title: 'Ada' } ];

    component.download();

    expect(csvService.exportFormattedCSV).toHaveBeenCalledWith({ data: [ { Title: 'Ada' } ], title: 'Resource Views' });
  });
});

describe('ReportsCsvPreviewComponent rendering', () => {
  const key = 'planet-csv-preview-render';

  beforeEach(waitForAsync(() => {
    window.localStorage.clear();
    window.localStorage.setItem(key, JSON.stringify({
      title: 'Resources Overview',
      columns: [ 'Title', 'Views' ],
      rows: [ { Title: 'Ada', Views: '2' } ],
      truncated: false,
      createdOn: Date.now()
    }));
    TestBed.configureTestingModule({
      imports: [ ReportsCsvPreviewComponent ],
      providers: [
        provideNoopAnimations(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: { key } } } },
        { provide: CsvService, useValue: { exportFormattedCSV: vi.fn() } }
      ]
    }).compileComponents();
  }));

  it('renders the previewed rows in a table', async () => {
    const fixture = TestBed.createComponent(ReportsCsvPreviewComponent);
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 400));
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Resources Overview');
    expect(element.querySelectorAll('th').length).toBe(2);
    expect(element.textContent).toContain('Ada');
    fixture.destroy();
  });
});
