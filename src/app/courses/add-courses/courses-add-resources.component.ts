import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { ResourcesComponent } from '../../resources/resources.component';

@Component({
  template: `
    <planet-resources [isDialog]="true"></planet-resources>
    <mat-dialog-actions>
      <button color="primary" mat-raised-button (click)="ok()" [planetSubmit]="spinnerOn" i18n>OK</button>
      <button color="warn" mat-raised-button mat-dialog-close i18n>Cancel</button>
    </mat-dialog-actions>
  `
})
export class CoursesAddResourcesComponent {

  @ViewChild(ResourcesComponent) resourcesComponent: ResourcesComponent;

  constructor(
    public dialogRef: MatDialogRef<CoursesAddResourcesComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ok() {
    const tableData = this.resourcesComponent.resources.data;
    const selection = this.resourcesComponent.selection.selected;
    const resources = tableData.filter((resource: any) => selection.indexOf(resource._id) > -1);
    this.data.okClick(resources);
  }

}
