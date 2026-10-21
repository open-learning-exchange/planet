import { SelectionModel } from '@angular/cdk/collections';
import { MatTableDataSource } from '@angular/material/table';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface PaginatedSelectionOptions<T, S> {
  selectValue?: (row: T) => S;
  isSelectable?: (row: T) => boolean;
  // Page changes keep the selection, and deselecting a page leaves other pages' rows selected
  keepAcrossPages?: boolean;
}

export class PaginatedSelection<T = any, S = any> {
  renderedRows: T[] = [];
  private readonly selectValue: (row: T) => S;
  private readonly isSelectable: (row: T) => boolean;
  private readonly keepAcrossPages: boolean;

  constructor(private readonly selection: SelectionModel<S>, options: PaginatedSelectionOptions<T, S> = {}) {
    this.selectValue = options.selectValue ?? ((row: any) => row._id);
    this.isSelectable = options.isSelectable ?? (() => true);
    this.keepAcrossPages = options.keepAcrossPages ?? false;
  }

  connect(dataSource: MatTableDataSource<T>, until: Observable<unknown>) {
    dataSource.connect().pipe(takeUntil(until)).subscribe(rows => this.renderedRows = rows);
  }

  isAllSelected() {
    let hasSelectable = false;
    for (const row of this.renderedRows) {
      if (!this.isSelectable(row)) {
        continue;
      }
      if (!this.selection.isSelected(this.selectValue(row))) {
        return false;
      }
      hasSelectable = true;
    }
    return hasSelectable;
  }

  masterToggle() {
    const values = this.renderedRows.filter(row => this.isSelectable(row)).map(row => this.selectValue(row));
    if (!this.isAllSelected()) {
      this.selection.select(...values);
    } else if (this.keepAcrossPages) {
      this.selection.deselect(...values);
    } else {
      this.selection.clear();
    }
  }

  onPageChange() {
    if (!this.keepAcrossPages) {
      this.selection.clear();
    }
  }

  // Waits a microtask so the rendered rows include the paginator's move back from a page the filter emptied
  removeFiltered() {
    queueMicrotask(() => {
      const visibleValues = new Set(this.renderedRows.map(row => this.selectValue(row)));
      this.selection.deselect(...this.selection.selected.filter(value => !visibleValues.has(value)));
    });
  }
}
