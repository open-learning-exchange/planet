import { filterAdvancedSearch, filterSpecificFieldsByWord, filterSpecificFieldsHybrid } from './table.helpers';

describe('filterSpecificFieldsHybrid', () => {
  const filter = filterSpecificFieldsHybrid([ 'doc.courseTitle', 'doc.description' ]);
  const course = (courseTitle: string, description = '') => ({ doc: { courseTitle, description } });

  it('matches words spread across the fields', () => {
    expect(filter(course('Introduction to Beekeeping', 'Hives and honey'), 'beekeeping honey')).toBe(true);
  });

  it('excludes rows whose fields are empty or missing', () => {
    expect(filter(course(''), 'beekeeping')).toBe(false);
    expect(filter({}, 'beekeeping')).toBe(false);
  });

  it('includes every row when there is nothing to search for', () => {
    expect(filter(course('Introduction to Beekeeping'), '')).toBe(true);
    expect(filter({}, ' ')).toBe(true);
  });

  it('matches exact fields only exactly', () => {
    const planetFilter = filterSpecificFieldsHybrid([ 'name' ], [ 'code' ]);
    const planet = { name: 'Learning Planet', code: 'abcd' };
    expect(planetFilter(planet, 'lerning abcd')).toBe(true);
    expect(planetFilter(planet, 'abce')).toBe(false);
  });
});

describe('filterSpecificFieldsByWord', () => {
  const filter = filterSpecificFieldsByWord([ 'fullName', 'doc.name' ]);
  const user = { fullName: 'Maria Garcia', doc: { name: 'mgarcia' } };

  it('matches each word exactly, in any order', () => {
    expect(filter(user, 'garcia maria')).toBe(true);
    expect(filter(user, 'mario')).toBe(false);
  });
});

describe('filterAdvancedSearch', () => {
  const resource = (subject: string[], filename: string) => ({ doc: { subject, filename } });
  const extension = (doc: any) => doc.filename.split('.').pop();

  it('matches fields on the document by default', () => {
    const filter = filterAdvancedSearch({ subject: [ 'Arts' ] });
    expect(filter(resource([ 'Arts', 'History' ], 'notes.pdf'), '')).toBe(true);
    expect(filter(resource([ 'History' ], 'notes.pdf'), '')).toBe(false);
  });

  it('matches a field through its value function', () => {
    const filter = filterAdvancedSearch({ subject: [ 'Arts' ], extension: [ 'pdf' ] }, { extension });
    expect(filter(resource([ 'Arts' ], 'notes.pdf'), '')).toBe(true);
    expect(filter(resource([ 'Arts' ], 'clip.mp4'), '')).toBe(false);
    expect(filter(resource([ 'History' ], 'notes.pdf'), '')).toBe(false);
  });
});
