import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { ExamsViewComponent } from './exams-view.component';
import { MatButton } from '@angular/material/button';

@Component({
    template: `
    <mat-dialog-content>
      <planet-exams-view [isDialog]="true" [questionNum]="1" [exam]="data.exam" [previewExamType]="data.examType"></planet-exams-view>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button color="primary" mat-raised-button mat-dialog-close i18n>Close Preview</button>
    </mat-dialog-actions>
  `,
    imports: [CdkScrollable, MatDialogContent, ExamsViewComponent, MatDialogActions, MatButton, MatDialogClose]
})
export class ExamsPreviewComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

}
