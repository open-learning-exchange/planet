import { Router, ActivatedRoute } from '@angular/router';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

@Component({
  template: `
    <mat-dialog-content>
      <planet-resources-viewer [isDialog]="true" [resourceId]="data.resourceId"></planet-resources-viewer>
    </mat-dialog-content>
    <mat-dialog-actions style="float:right">
      <button mat-raised-button color="primary" (click)="viewResources()">View Resource</button>
    </mat-dialog-actions>
  `
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
    const route = 'resources/' + 'view/' + this.data.resourceId.toString();
    this.router.navigate([ route ], { relativeTo: this.route });
  }

}
