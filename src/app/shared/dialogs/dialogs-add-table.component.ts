import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CoursesComponent } from '../../courses/courses.component';
import { DialogsLoadingService } from './dialogs-loading.service';
import { UsersComponent } from '../../users/users.component';

@Component({
  templateUrl: 'dialogs-add-table.component.html'
})
export class DialogsAddTableComponent implements AfterViewInit {

  @ViewChild(CoursesComponent) coursesComponent: CoursesComponent;
  @ViewChild(UsersComponent) usersComponent: UsersComponent;
  mode: 'courses' | 'users' = 'courses';
  okDisabled = true;
  get component() {
    return this.mode === 'courses' ?
      this.coursesComponent :
      this.mode === 'users' ?
      this.usersComponent.usersTable :
      undefined;
  }

  constructor(
    public dialogRef: MatDialogRef<DialogsAddTableComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.mode = this.data.mode;
  }

  ngAfterViewInit() {
    this.component.selection.changed.subscribe((selection) => {
      this.okDisabled = selection.source.selected.length === 0;
    });
  }

  ok() {
    if (!this.data.noSpinner) {
      this.dialogsLoadingService.start();
    }
    const tableData = this.component.tableData;
    const selection = this.component.selection.selected;
    const items = typeof selection[0] === 'string' ?
      tableData.data.filter((item: any) => selection.indexOf(item._id) > -1) :
      selection;
    this.data.okClick(items);
  }

}
