import * as papa from 'papaparse';

import { CsvService } from './csv.service';

describe('CsvService', () => {
  let service: CsvService;

  beforeEach(() => {
    service = new CsvService({} as any, {} as any, {} as any);
  });

  const parseCsv = (csv: string) => (service as any).parseCsv(papa, csv);

  it('parses a standard CSV', () => {
    expect(parseCsv('Name,Score\nAda,10\nGrace,12')).toEqual({
      columns: [ 'Name', 'Score' ],
      rows: [
        { Name: 'Ada', Score: '10' },
        { Name: 'Grace', Score: '12' }
      ]
    });
  });

  it('skips a short exported report title row before the header', () => {
    expect(parseCsv('Report title\nName,Score\nAda,10')).toEqual({
      columns: [ 'Name', 'Score' ],
      rows: [ { Name: 'Ada', Score: '10' } ]
    });
  });

  it('keeps the first row as the header for ragged CSV data', () => {
    expect(parseCsv('Name,Score\nAda,10,extra')).toEqual({
      columns: [ 'Name', 'Score' ],
      rows: [ { Name: 'Ada', Score: '10' } ]
    });
  });

  it('handles empty CSV content', () => {
    expect(parseCsv('')).toEqual({ columns: [], rows: [] });
  });

  it('parses a single-column CSV', () => {
    expect(parseCsv('Count\n1\n2')).toEqual({
      columns: [ 'Count' ],
      rows: [
        { Count: '1' },
        { Count: '2' }
      ]
    });
  });

  it('deduplicates blank and repeated column names', () => {
    expect(parseCsv('Name,Name,\nAda,10,x')).toEqual({
      columns: [ 'Name', 'Name (2)', 'Column 3' ],
      rows: [ { Name: 'Ada', 'Name (2)': '10', 'Column 3': 'x' } ]
    });
  });
});
