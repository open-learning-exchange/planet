import { Component, Inject, ViewChild, AfterViewInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';

import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';

import { CoursesComponent } from '../../courses/courses.component';
import { UsersComponent } from '../../users/users.component';
import { TeamsComponent } from '../../teams/teams.component';

@Component({
  templateUrl: 'tables-add-dialog.component.html',
  imports: [
    CdkScrollable,
    MatDialogContent,
    CoursesComponent,
    UsersComponent,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    TeamsComponent,
    MatDialogActions,
    MatButton,
    MatDialogClose
  ]
})
export class TablesAddDialogComponent implements AfterViewInit {

  @ViewChild(CoursesComponent) coursesComponent: CoursesComponent;
  @ViewChild(UsersComponent) usersComponent: UsersComponent;
  @ViewChild(TeamsComponent) teamsComponent: TeamsComponent;
  mode: 'courses' | 'users' | 'teams' = 'courses';
  selectedCount = 0;
  get component() {
    return this.mode === 'courses' ? this.coursesComponent :
      this.mode === 'users' ? this.usersComponent.usersTable :
      this.mode === 'teams' ? this.teamsComponent :
      undefined;
  }
  selectedLink: { title, selector? };
  links: { title, selector? }[] = [
    { title: $localize`Teams`, selector: { type: 'team' } },
    { title: $localize`Enterprises`, selector: { type: 'enterprise' } }
  ];
  teamsSelected = [];

  constructor(
    public dialogRef: MatDialogRef<TablesAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.mode = this.data.mode;
  }

  ngAfterViewInit() {
    // Teams mode counts through teamSelect, and its table is not rendered until a link type is chosen
    if (this.mode === 'teams') {
      return;
    }
    this.component.selection.changed.subscribe((selection) => {
      this.selectedCount = selection.source.selected.length;
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

  teamSelect({ teamId }) {
    const index = this.teamsSelected.indexOf(teamId);
    if (index === -1) {
      this.teamsSelected.push(teamId);
    } else {
      this.teamsSelected.splice(index, 1);
    }
    this.selectedCount = this.teamsSelected.length;
  }

  onSelectionChange(selected: any) {
    this.selectedLink = this.links.find(link => link.selector?.type === selected.value.selector.type);
  }

}
