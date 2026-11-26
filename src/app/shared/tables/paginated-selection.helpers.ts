import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PaginatedSelectionOptions<T, S> {
  selectValue?: (row: T) => S;
  isSelectable?: (row: T) => boolean;
}

export class PaginatedSelection<T = any, S = any> {
  renderedRows: T[] = [];
  private readonly selectValue: (row: T) => S;
  private readonly isSelectable: (row: T) => boolean;

  constructor(private readonly selection: SelectionModel<S>, options: PaginatedSelectionOptions<T, S> = {}) {
    this.selectValue = options.selectValue ?? ((row: any) => row._id);
    this.isSelectable = options.isSelectable ?? (() => true);
  }

  connect(dataSource: MatTableDataSource<T>, until: Observable<unknown>, { keepFilteredOut = false } = {}) {
    dataSource.connect().pipe(takeUntil(until)).subscribe(rows => {
      this.renderedRows = rows;
      if (!keepFilteredOut) {
        this.deselectMissing(dataSource.filteredData);
      }
    });
  }

  isAllSelected() {
    const values = this.selectableValues();
    return values.length > 0 && values.every(value => this.selection.isSelected(value));
  }

  isAnySelected() {
    return this.selectableValues().some(value => this.selection.isSelected(value));
  }

  masterToggle() {
    const values = this.selectableValues();
    if (this.isAllSelected()) {
      this.selection.deselect(...values);
    } else {
      this.selection.select(...values);
    }
  }

  private selectableValues() {
    return this.renderedRows.filter(row => this.isSelectable(row)).map(row => this.selectValue(row));
  }

  // Goes through isSelected so a table's compareWith (users match on _id and planetCode) still applies
  private deselectMissing(rows: T[]) {
    const kept = rows.map(row => this.selectValue(row)).filter(value => this.selection.isSelected(value));
    if (kept.length < this.selection.selected.length) {
      this.selection.setSelection(...kept);
    }
  }
}
