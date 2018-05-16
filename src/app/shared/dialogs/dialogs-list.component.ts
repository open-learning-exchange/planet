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
  ` ]
})
export class DialogsListComponent implements AfterViewInit {

  tableData = new MatTableDataSource();
  tableColumns: string[] = [];
  selection = new SelectionModel(false, []);
  pageEvent: PageEvent;
  @ViewChild('paginator') paginator: MatPaginator;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
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
    this.data.okClick(this.selection.selected[0]);
  }

  applyFilter(filterValue: string) {
    this.tableData.filter = filterValue;
  }

}
