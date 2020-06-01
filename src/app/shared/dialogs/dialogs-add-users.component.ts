import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { UsersComponent } from '../../users/users.component';
import { DialogsLoadingService } from './dialogs-loading.service';

@Component({
  templateUrl: 'dialogs-add-users.component.html'
})
export class DialogsAddUsersComponent implements AfterViewInit {

  @ViewChild(UsersComponent, { static: false }) usersComponent: UsersComponent;
  okDisabled = true;

  constructor(
    public dialogRef: MatDialogRef<DialogsAddUsersComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngAfterViewInit() {
    this.usersComponent.usersTable.selection.onChange.subscribe((selection) => {
      this.okDisabled = selection.source.selected.length === 0;
    });
  }

  ok() {
    if (!this.data.noSpinner) {
      this.dialogsLoadingService.start();
    }
    this.addExistingUsers();
  }

  addExistingUsers() {
    const tableData = this.usersComponent.usersTable.usersTable.data;
    const selection = this.usersComponent.usersTable.selection.selected;
    const users = tableData.filter((user: any) => selection.indexOf(user._id) > -1);
    this.data.okClick(users);
  }

}
