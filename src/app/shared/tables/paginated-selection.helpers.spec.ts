import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { NEVER } from 'rxjs';
import { PaginatedSelection } from './paginated-selection.helpers';

describe('PaginatedSelection', () => {
  const page = [ { _id: 'a' }, { _id: 'b' } ];
  let selection: SelectionModel<any>;

  const createPageSelection = (rows: any[], options = {}) => {
    const dataSource = new MatTableDataSource(rows);
    const pageSelection = new PaginatedSelection(selection, options);
    pageSelection.connect(dataSource, NEVER);
    return { dataSource, pageSelection };
  };

  beforeEach(() => {
    selection = new SelectionModel<any>(true, []);
  });

  it('reports nothing selected when no rows are rendered', () => {
    expect(createPageSelection([]).pageSelection.isAllSelected()).toBe(false);
  });

  it('reports all selected only once every rendered row is selected', () => {
    const { pageSelection } = createPageSelection(page);
    selection.select('a');
    expect(pageSelection.isAllSelected()).toBe(false);
    selection.select('b');
    expect(pageSelection.isAllSelected()).toBe(true);
  });

  it('ignores selections that are not on the rendered page', () => {
    selection.select('a', 'b', 'offPage');
    expect(createPageSelection(page).pageSelection.isAllSelected()).toBe(true);
  });

  it('selects only the rendered rows', () => {
    createPageSelection(page).pageSelection.masterToggle();
    expect(selection.selected).toEqual([ 'a', 'b' ]);
  });

  it('clears the whole selection on deselect and page change', () => {
    const { pageSelection } = createPageSelection(page);
    selection.select('a', 'b', 'offPage');
    pageSelection.masterToggle();
    expect(selection.isEmpty()).toBe(true);
    selection.select('a');
    pageSelection.onPageChange();
    expect(selection.isEmpty()).toBe(true);
  });

  it('keeps selections from other pages when kept across pages', () => {
    const { pageSelection } = createPageSelection(page, { keepAcrossPages: true });
    selection.select('a', 'b', 'offPage');
    pageSelection.onPageChange();
    expect(selection.selected).toEqual([ 'a', 'b', 'offPage' ]);
    pageSelection.masterToggle();
    expect(selection.selected).toEqual([ 'offPage' ]);
  });

  it('skips rows that are not selectable', () => {
    const rows = [ { _id: 'a' }, { _id: 'b', parent: true } ];
    const { pageSelection } = createPageSelection(rows, { isSelectable: (row: any) => row.parent !== true });
    pageSelection.masterToggle();
    expect(selection.selected).toEqual([ 'a' ]);
    expect(pageSelection.isAllSelected()).toBe(true);
  });

  it('honors a custom select value', () => {
    const rows = [ { _id: 'a', planetCode: 'x' } ];
    createPageSelection(rows, { selectValue: (row: any) => row._id + row.planetCode }).pageSelection.masterToggle();
    expect(selection.selected).toEqual([ 'ax' ]);
  });

  it('removes selections filtered out after rendered rows update', async () => {
    const { dataSource, pageSelection } = createPageSelection(page);
    selection.select('a', 'b', 'offPage');

    pageSelection.removeFiltered();
    dataSource.filter = 'a';
    await Promise.resolve();

    expect(selection.selected).toEqual([ 'a' ]);
  });
});
