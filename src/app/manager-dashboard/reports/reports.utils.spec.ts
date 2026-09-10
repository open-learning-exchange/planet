import { formatDemographicsForCsv } from './reports.utils';

describe('reports utils', () => {

  describe('formatDemographicsForCsv', () => {

    it('replaces raw demographic keys with localized headers and values', () => {
      const formatted = formatDemographicsForCsv({ user: 'ada', gender: 'female', source: 'health', age: 28, time: 1 });

      expect(formatted).toEqual({
        user: 'ada',
        Gender: 'Female',
        source: 'health',
        'Age (years)': 28,
        time: 1
      });
      expect(Object.keys(formatted)).toEqual([ 'user', 'Gender', 'source', 'Age (years)', 'time' ]);
    });

    it('adds the columns a record never stored, so the headers taken from the first row are complete', () => {
      const formatted = formatDemographicsForCsv({ user: 'ada', time: 1 });

      expect(formatted).toEqual({ user: 'ada', time: 1, Gender: '', 'Age (years)': '' });
      expect(Object.keys(formatted)).toEqual([ 'user', 'time', 'Gender', 'Age (years)' ]);
    });

  });

});
