import { filterSpecificFields, filterSpecificFieldsHybrid } from './table-helpers';

describe('filterSpecificFields', () => {
  const filter = filterSpecificFields([ 'doc.name', 'code' ]);

  it('matches the whole filter as a substring of any field', () => {
    expect(filter({ doc: { name: 'Learning Café' }, code: 'lc' }, 'ing cafe')).toBe(true);
    expect(filter({ doc: { name: 'Learning Café' }, code: 'lc' }, 'cafe learning')).toBe(false);
  });

  it('ignores fields that are missing or not strings', () => {
    expect(filter({ doc: {}, code: 12 }, 'lc')).toBe(false);
  });
});

describe('filterSpecificFieldsHybrid', () => {
  const filter = filterSpecificFieldsHybrid([ 'doc.courseTitle', 'doc.description' ]);
  const course = (courseTitle: string, description = '') => ({ doc: { courseTitle, description } });

  it('matches on a substring of any of the fields', () => {
    expect(filter(course('Introduction to Beekeeping'), 'bee')).toBe(true);
    expect(filter(course('Introduction to Beekeeping', 'Hives and honey'), 'honey')).toBe(true);
  });

  it('matches each word of the filter in any order', () => {
    expect(filter(course('Introduction to Beekeeping'), 'beekeeping intro')).toBe(true);
  });

  it('matches words spread across the fields', () => {
    expect(filter(course('Introduction to Beekeeping', 'Hives and honey'), 'beekeeping honey')).toBe(true);
  });

  it('forgives typos', () => {
    expect(filter(course('Introduction to Beekeeping'), 'beekeping')).toBe(true);
    expect(filter(course('Introduction to Beekeeping'), 'intorduction')).toBe(true);
  });

  it('does not match an unrelated search', () => {
    expect(filter(course('Introduction to Beekeeping', 'Hives and honey'), 'geometry')).toBe(false);
  });

  it('excludes rows whose fields are empty or missing', () => {
    expect(filter(course(''), 'beekeeping')).toBe(false);
    expect(filter({ doc: {} }, 'beekeeping')).toBe(false);
    expect(filter({}, 'beekeeping')).toBe(false);
  });

  it('includes every row when there is nothing to search for', () => {
    expect(filter(course('Introduction to Beekeeping'), '')).toBe(true);
    expect(filter(course(''), ' ')).toBe(true);
    expect(filter({}, ' ')).toBe(true);
  });

  it('takes fuzzy search options', () => {
    expect(filter(course('Introduction to Beekeeping'), 'beekeping')).toBe(true);
    expect(filterSpecificFieldsHybrid([ 'doc.courseTitle' ], { maxDistance: 0, threshold: 1 })(
      course('Introduction to Beekeeping'), 'beekeping'
    )).toBe(false);
  });
});
