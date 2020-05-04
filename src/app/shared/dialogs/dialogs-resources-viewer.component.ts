import { Router, ActivatedRoute } from '@angular/router';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  template: `
    <div mat-dialog-title>
      <button mat-dialog-close mat-icon-button class="close-dialog" i18n>
        <mat-icon>clear</mat-icon>
      </button>
    </div>
    <mat-dialog-content>
      <planet-resources-viewer [isDialog]="true" [resourceId]="data.resourceId"></planet-resources-viewer>
    </mat-dialog-content>
    <mat-dialog-actions style="float:right">
      <button mat-raised-button color="primary" (click)="viewResources()">View Resource</button>
    </mat-dialog-actions>
  `,
  styleUrls: [ './dialogs-resources-viewer.scss' ]
})
export class DialogsResourcesViewerComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<DialogsResourcesViewerComponent>,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  viewResources() {
    this.dialogRef.close();
    this.router.navigate([ `/resources/view/${this.data.resourceId}` ], { relativeTo: this.route });
  }

}
