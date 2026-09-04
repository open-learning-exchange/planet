import { SelectionModel } from '@angular/cdk/collections';
import {
  filterSpecificFields, filterSpecificFieldsHybrid, isAllVisibleSelected, removeFilteredFromSelection, toggleVisibleSelection
} from './table-helpers';

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
