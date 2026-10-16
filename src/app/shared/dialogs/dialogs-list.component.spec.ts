import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogsListComponent } from './dialogs-list.component';

describe('DialogsListComponent select all', () => {
  let component: DialogsListComponent;
  let fixture: ComponentFixture<DialogsListComponent>;

  // Twelve rows against the dialog's default page size of five, so "select all" spans more than one page
  const tableData = Array.from({ length: 12 }, (unused, index) => ({ _id: `id-${index}`, name: `name-${index}` }));
  const firstPage = [ 'id-0', 'id-1', 'id-2', 'id-3', 'id-4' ];

  // MatTableDataSource sets the paginator length in a microtask, so flush before paging
  const createComponent = async (initialSelection: any[] = [], rows = tableData) => {
    TestBed.configureTestingModule({
      imports: [ DialogsListComponent, NoopAnimationsModule ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: {
          tableData: rows,
          columns: [ 'name' ],
          itemDescription: 'members',
          nameProperty: 'name',
          okClick: () => {},
          dropdownSettings: undefined,
          allowMulti: true,
          initialSelection
        } }
      ]
    });
    fixture = TestBed.createComponent(DialogsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const goToNextPage = async () => {
    component.paginator.nextPage();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.paginator.pageIndex).toBe(1);
  };

  it('selects only the rows on the current page, not the whole filtered list', async () => {
    await createComponent();
    component.masterToggle();
    expect(component.selection.selected).toEqual(firstPage);
  });

  it('reports all selected once the current page is fully selected', async () => {
    await createComponent();
    expect(component.isAllSelected()).toBe('no');
    component.masterToggle();
    expect(component.isAllSelected()).toBe('yes');
  });

  it('accumulates a selection across pages', async () => {
    await createComponent();
    component.masterToggle();
    await goToNextPage();
    expect(component.isAllSelected()).toBe('no');
    component.masterToggle();
    expect(component.selection.selected.length).toBe(10);
  });

  it('deselects only the current page, keeping selections made on other pages', async () => {
    await createComponent();
    component.masterToggle();
    await goToNextPage();
    component.masterToggle();
    expect(component.selection.selected.length).toBe(10);
    component.masterToggle();
    expect(component.selection.selected).toEqual(firstPage);
  });

  it('keeps the tooltip in step with the rows it toggled', async () => {
    await createComponent();
    component.masterToggle();
    expect(component.tooltipText).toBe('name-0, name-1, name-2, name-3, name-4');
    component.masterToggle();
    expect(component.tooltipText).toBe('');
  });

  it('keeps a shared name when a selected row on another page still has it', async () => {
    const rows = tableData.map((row, index) => index === 5 ? { ...row, name: 'name-0' } : row);
    await createComponent([], rows);
    component.masterToggle();
    await goToNextPage();
    component.masterToggle();
    component.masterToggle();

    expect(component.selection.selected).toEqual(firstPage);
    expect(component.tooltipText).toBe('name-0, name-1, name-2, name-3, name-4');
  });

  it('drops initial selections whose rows no longer exist', async () => {
    await createComponent([ 'missing-id', 'id-0' ]);

    expect(component.selection.selected).toEqual([ 'id-0' ]);
    expect(component.selectedRows()).toEqual([ tableData[0] ]);
    expect(component.tooltipText).toBe('name-0');
  });

  it('does not report an initial selection from a later page as all selected', async () => {
    await createComponent([ 'id-7', 'id-8' ]);
    expect(component.isAllSelected()).toBe('no');
    await goToNextPage();
    expect(component.isAllSelected()).toBe('no');
  });

  it('returns to the first page before applying a filter', async () => {
    await createComponent();
    await goToNextPage();

    component.applyFilter('name-0');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.paginator.pageIndex).toBe(0);
    component.masterToggle();
    expect(component.selection.selected).toEqual([ 'id-0' ]);
  });
});
