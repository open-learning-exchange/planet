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
  }) {
    this.selection = new SelectionModel(this.data.allowMulti || false, []);
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
    this.data.okClick(this.selection.selected);
  }

  applyFilter(filterValue: string) {
    this.tableData.filter = filterValue;
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.tableData.data.length;
    return numSelected === numRows ? 'yes' : 'no';
  }

  masterToggle() {
    if (this.isAllSelected() === 'yes') {
      this.selection.clear();
    } else {
      this.tableData.data.forEach(row => this.selection.select(row));
    }
  }

}
