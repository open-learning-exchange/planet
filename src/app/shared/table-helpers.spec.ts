import { SelectionModel } from '@angular/cdk/collections';
import { isAllVisibleSelected, toggleVisibleSelection } from './table-helpers';

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

  it('skips rows that are not selectable', () => {
    const rows = [ { _id: 'a' }, { _id: 'b', parent: true } ];
    const isSelectable = (row: any) => row.parent !== true;
    toggleVisibleSelection(selection, rows, (row: any) => row._id, isSelectable);
    expect(selection.selected).toEqual([ 'a' ]);
    expect(isAllVisibleSelected(selection, rows, (row: any) => row._id, isSelectable)).toBe(true);
  });

  it('honors a custom select value', () => {
    const rows = [ { _id: 'a', planetCode: 'x' } ];
    toggleVisibleSelection(selection, rows, (row: any) => row._id + row.planetCode);
    expect(selection.selected).toEqual([ 'ax' ]);
  });
});
