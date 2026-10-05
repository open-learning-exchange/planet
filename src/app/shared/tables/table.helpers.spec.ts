import { SelectionModel } from '@angular/cdk/collections';
import {
  filterAdvancedSearch, filterSpecificFieldsByWord, filterSpecificFieldsHybrid, isAllVisibleSelected, removeFilteredFromSelection,
  toggleVisibleSelection
} from './table.helpers';

describe('table-helpers select-all', () => {
  const page = [ { _id: 'a' }, { _id: 'b' } ];
  let selection: SelectionModel<any>;

  beforeEach(() => {
    selection = new SelectionModel<any>(true, []);
  });

  it('reports nothing selected when no rows are rendered', () => {
    expect(isAllVisibleSelected(selection, [])).toBe(false);
  });

  it('reports all selected only once every rendered row is selected', () => {
    selection.select('a');
    expect(isAllVisibleSelected(selection, page)).toBe(false);
    selection.select('b');
    expect(isAllVisibleSelected(selection, page)).toBe(true);
  });

  it('ignores selections that are not on the rendered page', () => {
    selection.select('a', 'b', 'offPage');
    expect(isAllVisibleSelected(selection, page)).toBe(true);
  });

  it('selects only the rendered rows', () => {
    toggleVisibleSelection(selection, page);
    expect(selection.selected).toEqual([ 'a', 'b' ]);
  });

  it('deselects only the rendered rows, leaving the rest of the selection intact', () => {
    selection.select('a', 'b', 'offPage');
    toggleVisibleSelection(selection, page);
    expect(selection.selected).toEqual([ 'offPage' ]);
  });

  it('clears the whole selection when configured to do so', () => {
    selection.select('a', 'b', 'offPage');
    toggleVisibleSelection(selection, page, { clearAllOnDeselect: true });
    expect(selection.isEmpty()).toBe(true);
  });

  it('skips rows that are not selectable', () => {
    const rows = [ { _id: 'a' }, { _id: 'b', parent: true } ];
    const isSelectable = (row: any) => row.parent !== true;
    toggleVisibleSelection(selection, rows, { selectValue: (row: any) => row._id, isSelectable });
    expect(selection.selected).toEqual([ 'a' ]);
    expect(isAllVisibleSelected(selection, rows, { selectValue: (row: any) => row._id, isSelectable })).toBe(true);
  });

  it('honors a custom select value', () => {
    const rows = [ { _id: 'a', planetCode: 'x' } ];
    toggleVisibleSelection(selection, rows, { selectValue: (row: any) => row._id + row.planetCode });
    expect(selection.selected).toEqual([ 'ax' ]);
  });

  it('removes selections filtered out after rendered rows update', async () => {
    let renderedRows = page;
    selection.select('a', 'b', 'offPage');

    removeFilteredFromSelection(selection, () => renderedRows);
    renderedRows = [ page[0] ];
    await Promise.resolve();

    expect(selection.selected).toEqual([ 'a' ]);
  });
});

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
