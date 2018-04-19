/*
 *  Material dialog component for selecting an object from a
 *  list, rendered as a Material table
 */

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  templateUrl: './dialogs-list.component.html'
})
export class DialogsListComponent {

  tableData:any = [];
  tableColumns: string[] = [];
  selection = new SelectionModel(false, []);

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {
    this.tableData = this.data.tableData;
    this.tableColumns = this.data.columns;
  }

  ok() {
    this.data.okClick(this.selection.selected[0]);
  }

}
