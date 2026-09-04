import * as papa from 'papaparse';
import { of } from 'rxjs';

import {
  CSV_PREVIEW_MAX_ROWS, CSV_PREVIEW_STORAGE_MAX_BYTES, CsvPreviewSession, CsvService, csvColumnsOf
} from './csv.service';

describe('CsvService', () => {
  let service: CsvService;
  let couchService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    couchService = { get: vi.fn() };
    service = new CsvService(couchService as any, {} as any, {} as any, {} as any, 'en-US');
  });

  const parseCsv = (csv: string) => (service as any).parseCsv(papa, csv);

  it('parses a standard CSV', () => {
    expect(parseCsv('Name,Score\nAda,10\nGrace,12')).toEqual({
      columns: [ 'Name', 'Score' ],
      rows: [
        { Name: 'Ada', Score: '10' },
        { Name: 'Grace', Score: '12' }
      ],
      truncated: false
    });
  });

  it('skips a short exported report title row before the header', () => {
    expect(parseCsv('Report title\nName,Score\nAda,10')).toEqual({
      columns: [ 'Name', 'Score' ],
      rows: [ { Name: 'Ada', Score: '10' } ],
      truncated: false
    });
  });

  it('skips multiple short preamble rows before the header', () => {
    expect(parseCsv('Report title\nGenerated today\nName,Score\nAda,10')).toEqual({
      columns: [ 'Name', 'Score' ],
      rows: [ { Name: 'Ada', Score: '10' } ],
      truncated: false
    });
  });

  it('keeps the first row as the header for ragged CSV data', () => {
    expect(parseCsv('Name,Score\nAda,10,extra')).toEqual({
      columns: [ 'Name', 'Score', 'Column 3' ],
      rows: [ { Name: 'Ada', Score: '10', 'Column 3': 'extra' } ],
      truncated: false
    });
  });

  it('handles empty CSV content', () => {
    expect(parseCsv('')).toEqual({ columns: [], rows: [], truncated: false });
  });

  it('parses a single-column CSV', () => {
    expect(parseCsv('Count\n1\n2')).toEqual({
      columns: [ 'Count' ],
      rows: [
        { Count: '1' },
        { Count: '2' }
      ],
      truncated: false
    });
  });

  it('deduplicates blank and repeated column names', () => {
    expect(parseCsv('Name,Name,\nAda,10,x')).toEqual({
      columns: [ 'Name', 'Name (2)', 'Column 3' ],
      rows: [ { Name: 'Ada', 'Name (2)': '10', 'Column 3': 'x' } ],
      truncated: false
    });
  });

  it('deduplicates generated column names that collide with real headers', () => {
    expect(parseCsv('Name,Name,Name (2)\nAda,10,duplicate')).toEqual({
      columns: [ 'Name', 'Name (2)', 'Name (2) (2)' ],
      rows: [ { Name: 'Ada', 'Name (2)': '10', 'Name (2) (2)': 'duplicate' } ],
      truncated: false
    });
  });

  it('stores a __proto__ header as an own string property', () => {
    const result = parseCsv('__proto__,Name\nsafe,Ada');

    expect(Object.prototype.hasOwnProperty.call(result.rows[0], '__proto__')).toBe(true);
    expect(result.rows[0].__proto__).toBe('safe');
  });

  it('limits the number of materialized preview rows', () => {
    const rowsAtLimit = Array.from({ length: CSV_PREVIEW_MAX_ROWS }, (_, index) => `${index}`);
    const completeResult = parseCsv([ 'Count', ...rowsAtLimit ].join('\n'));
    const truncatedResult = parseCsv([ 'Count', ...rowsAtLimit, 'extra' ].join('\n'));

    expect(completeResult.rows).toHaveLength(CSV_PREVIEW_MAX_ROWS);
    expect(completeResult.truncated).toBe(false);
    expect(truncatedResult.rows).toHaveLength(CSV_PREVIEW_MAX_ROWS);
    expect(truncatedResult.truncated).toBe(true);
  });

  it('encodes CouchDB document and attachment path segments while preserving path separators', async () => {
    couchService.get.mockReturnValue(of('Name\nAda'));

    await service.loadCsvAttachment('doc/with?chars', 'data/scores #1%.csv').toPromise();

    expect(couchService.get).toHaveBeenCalledWith(
      'resources/doc%2Fwith%3Fchars/data/scores%20%231%25.csv',
      { responseType: 'text', domain: undefined }
    );
  });

  it('collects the union of row keys in the order they first appear', () => {
    expect(csvColumnsOf([ { Title: 'Ada', Views: 2 }, { Views: 1, Rating: 5 } ])).toEqual([ 'Title', 'Views', 'Rating' ]);
  });

  it('drops the fields that are never exported when formatting rows', () => {
    expect(service.formatExportRows([
      { _id: 'a', _rev: '1', resourceId: 'r', type: 'view', createdOn: 'planet', parentCode: 'code', hasInfo: true, user: 'ada' }
    ])).toEqual([ { user: 'ada' } ]);
  });
});

describe('CsvPreviewSession', () => {
  const key = 'planet-csv-preview-test';
  let target: { close: ReturnType<typeof vi.fn>, closed: boolean };
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    window.localStorage.clear();
    target = { close: vi.fn(), closed: false };
    onError = vi.fn();
  });

  const session = () => new CsvPreviewSession(key, target as any, onError);

  it('publishes the rows for the preview tab to pick up', () => {
    session().publish([ { Title: 'Ada' } ], 'Resource Views');

    expect(JSON.parse(window.localStorage.getItem(key))).toEqual(expect.objectContaining({
      title: 'Resource Views',
      columns: [ 'Title' ],
      rows: [ { Title: 'Ada' } ],
      truncated: false
    }));
  });

  it('closes the tab without storing anything when there are no rows', () => {
    session().publish([], 'Resource Views');

    expect(window.localStorage.getItem(key)).toBeNull();
    expect(target.close).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('closes the tab when the report is too large to store', () => {
    session().publish([ { Title: 'a'.repeat(CSV_PREVIEW_STORAGE_MAX_BYTES) } ], 'Resource Views');

    expect(window.localStorage.getItem(key)).toBeNull();
    expect(target.close).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('marks the preview truncated when the rows pass the preview limit', () => {
    const rows = Array.from({ length: CSV_PREVIEW_MAX_ROWS + 1 }, (_, index) => ({ Title: `${index}` }));

    session().publish(rows, 'Resource Views');

    const stored = JSON.parse(window.localStorage.getItem(key));
    expect(stored.rows).toHaveLength(CSV_PREVIEW_MAX_ROWS);
    expect(stored.truncated).toBe(true);
  });

  it('does nothing when the preview tab was blocked', () => {
    new CsvPreviewSession(key, null, onError).publish([ { Title: 'Ada' } ], 'Resource Views');

    expect(window.localStorage.getItem(key)).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });
});
