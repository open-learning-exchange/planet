import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CoursesComponent } from '../../courses/courses.component';
import { DialogsLoadingService } from './dialogs-loading.service';
import { UsersComponent } from '../../users/users.component';
import { TeamsComponent } from '../../teams/teams.component';

@Component({
  templateUrl: 'dialogs-add-table.component.html'
})
export class DialogsAddTableComponent implements AfterViewInit {

  @ViewChild(CoursesComponent) coursesComponent: CoursesComponent;
  @ViewChild(UsersComponent) usersComponent: UsersComponent;
  @ViewChild(TeamsComponent) teamsComponent: TeamsComponent;
  mode: 'courses' | 'users' | 'teams' = 'courses';
  okDisabled = true;
  get component() {
    return this.mode === 'courses' ? this.coursesComponent :
      this.mode === 'users' ? this.usersComponent.usersTable :
      this.mode === 'teams' ? this.teamsComponent :
      undefined;
  }
  selectedLink: { db, title, selector? };
  links: { db, title, selector? }[] = [
    { db: 'teams', title: $localize`Teams`, selector: { type: 'team' } },
    { db: 'teams', title: $localize`Enterprises`, selector: { type: 'enterprise' } }
  ];
  teamsSelected = [];

  constructor(
    public dialogRef: MatDialogRef<DialogsAddTableComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService,
  ) {
    this.mode = this.data.mode;
    if (this.mode === 'teams') {
      this.selectedLink = this.links[0];
    }
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
    if (this.mode === 'teams') {
      const items = tableData.data.filter((item: any) => this.teamsSelected.indexOf(item.doc._id) > -1);
      this.data.okClick(items);
    } else {
      const selection = this.component.selection.selected;
      const items = typeof selection[0] === 'string' ?
        tableData.data.filter((item: any) => selection.indexOf(item._id) > -1) :
        selection;
      this.data.okClick(items);
    }
  }

  teamSelect({teamId}) {
    this.okDisabled = !teamId;
    this.teamsSelected.push(teamId);
  }

}
