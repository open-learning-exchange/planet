import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { NEVER, of } from 'rxjs';
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

  it('selects only the rendered rows', () => {
    createPageSelection(page).pageSelection.masterToggle();
    expect(selection.selected).toEqual([ 'a', 'b' ]);
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

  const pagedRows = Array.from({ length: 12 }, (_, i) => ({ _id: `row${i}`, title: i === 11 ? 'needle' : 'hay' }));

  const createPagedSelection = (keepFilteredOut: boolean) => {
    const dataSource = new MatTableDataSource(pagedRows);
    dataSource.filterPredicate = (row, filter) => row.title === filter;
    dataSource.paginator = { pageIndex: 0, pageSize: 10, length: 0, initialized: of(undefined), page: NEVER } as any;
    const pageSelection = new PaginatedSelection(selection);
    pageSelection.connect(dataSource, NEVER, { keepFilteredOut });
    return { dataSource, pageSelection };
  };

  it('reads the header state from the rendered page only', () => {
    const { pageSelection } = createPagedSelection(false);
    selection.select('row11');
    expect(pageSelection.isAnySelected()).toBe(false);
    selection.select(...pagedRows.slice(0, 10).map(row => row._id));
    expect(pageSelection.isAllSelected()).toBe(true);
  });

  it('deselects only the rendered rows and keeps other pages', () => {
    const { pageSelection } = createPagedSelection(false);
    selection.select('row0', 'row1', 'row11');
    pageSelection.masterToggle();
    expect(pageSelection.isAllSelected()).toBe(true);
    pageSelection.masterToggle();
    expect(selection.selected).toEqual([ 'row11' ]);
  });

  it('keeps a selected row that is still in the filter but off the page', () => {
    const { dataSource, pageSelection } = createPagedSelection(false);
    dataSource.filter = 'needle';
    selection.select('row11');
    dataSource.filter = '';
    expect(pageSelection.renderedRows).not.toContain(pagedRows[11]);
    expect(selection.selected).toEqual([ 'row11' ]);
  });

  it('drops a selected row that leaves the filter', () => {
    const { dataSource } = createPagedSelection(false);
    selection.select('row0', 'row11');
    dataSource.filter = 'needle';
    expect(selection.selected).toEqual([ 'row11' ]);
  });

  it('keeps every pick in a picker when the filter changes', () => {
    const { dataSource } = createPagedSelection(true);
    selection.select('row0');
    dataSource.filter = 'needle';
    selection.select('row11');
    dataSource.filter = '';
    expect(selection.selected).toEqual([ 'row0', 'row11' ]);
  });

  it('matches a reloaded row through the selection compareWith', () => {
    selection = new SelectionModel<any>(true, [], true, (a, b) => a._id === b._id);
    const dataSource = new MatTableDataSource([ { _id: 'a' } ]);
    const pageSelection = new PaginatedSelection(selection, { selectValue: (row: any) => row });
    pageSelection.connect(dataSource, NEVER);
    selection.select(dataSource.data[0]);
    dataSource.data = [ { _id: 'a' }, { _id: 'b' } ];
    expect(selection.selected.map(row => row._id)).toEqual([ 'a' ]);
  });
});
