import { Component, Inject } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
  template: `
    <planet-exams-view [isDialog]="true" [questionNum]="1" [exam]="data.exam" [previewExamType]="data.examType"></planet-exams-view>
    <mat-dialog-actions>
      <button color="primary" mat-raised-button mat-dialog-close i18n>Close Preview</button>
    </mat-dialog-actions>
  `
})
export class ExamsPreviewComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

}
