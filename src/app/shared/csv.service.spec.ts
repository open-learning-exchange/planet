import * as papa from 'papaparse';
import { of } from 'rxjs';

import { CSV_PREVIEW_MAX_ROWS, CsvService } from './csv.service';

describe('CsvService', () => {
  let service: CsvService;
  let couchService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    couchService = { get: vi.fn() };
    service = new CsvService(couchService as any, {} as any, {} as any, 'en-US');
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
});
