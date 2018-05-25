/*
 *  Material dialog component for selecting an object from a
 *  list, rendered as a Material table
 */

import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MAT_DIALOG_DATA, MatPaginator, PageEvent } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  templateUrl: './dialogs-list.component.html',
  styles: [ `
    .search-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }
    mat-table {
      overflow-y: auto;
      height: calc(100% - 160px);
    }
  ` ]
})
export class DialogsListComponent implements AfterViewInit {

  tableData = new MatTableDataSource();
  tableColumns: string[] = [];
  selection = new SelectionModel(false, []);
  pageEvent: PageEvent;
  @ViewChild('paginator') paginator: MatPaginator;

  constructor(@Inject(MAT_DIALOG_DATA) public data: {
    tableData: any[],
    columns: string[],
    okClick: any,
    filterPredicate?: any,
    allowMulti?: boolean,
    initialSelection?: any[]
  }) {
    this.selection = new SelectionModel(this.data.allowMulti || false, this.data.initialSelection || []);
    this.tableData.data = this.data.tableData;
    this.tableColumns = this.data.columns;
    if (this.data.filterPredicate) {
      this.tableData.filterPredicate = this.data.filterPredicate;
    }
  }

  ngAfterViewInit() {
    this.tableData.paginator = this.paginator;
  }

  ok() {
    this.data.okClick(this.selectedRows());
  }

  applyFilter(filterValue: string) {
    this.tableData.filter = filterValue;
  }

  isAllSelected() {
    // Finds first instance that a filtered row id is not selected, and undefined if all are selected
    // Convert to boolean with ! (true = all selected, false = not all selected)
    const allShownSelected = !this.tableData.filteredData.find((row: any) => {
      return this.selection.selected.indexOf(row._id) === -1;
    });
    return allShownSelected ? 'yes' : 'no';
  }

  masterToggle() {
    if (this.isAllSelected() === 'yes') {
      this.tableData.filteredData.forEach((row: any) => {
        this.selection.deselect(row._id);
      });
    } else {
      // Only select items in the filter
      this.tableData.filteredData.forEach((row: any) => this.selection.select(row._id));
    }
  }

  selectedRows() {
    return this.selection.selected.map(id => this.tableData.data.find((row: any) => row._id === id));
  }


}
