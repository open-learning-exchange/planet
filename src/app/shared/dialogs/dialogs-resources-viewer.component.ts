import { Router } from '@angular/router';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ResourcesViewerComponent } from '../../resources/view-resources/resources-viewer.component';
import { MatButton } from '@angular/material/button';

@Component({
  template: `
    <mat-dialog-content>
      <planet-resources-viewer [isDialog]="true" [resourceId]="data.resourceId"></planet-resources-viewer>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-dialog-close mat-raised-button i18n>Close</button>
      <button mat-raised-button color="primary" (click)="viewResources()" i18n>View Resource</button>
    </mat-dialog-actions>
  `,
  imports: [CdkScrollable, MatDialogContent, ResourcesViewerComponent, MatDialogActions, MatButton, MatDialogClose]
})
export class DialogsResourcesViewerComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<DialogsResourcesViewerComponent>,
    private router: Router
  ) {}

  viewResources() {
    this.dialogRef.close();
    if (this.data.link) {
      this.router.navigate(this.data.link.commands, this.data.link.relativeTo ? { relativeTo: this.data.link.relativeTo } : {});
    } else {
      this.router.navigate([ '/resources/view', this.data.resourceId ]);
    }
  }

}
