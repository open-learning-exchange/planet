import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';

import { SubmissionsComponent } from '../../submissions/submissions.component';
import { ExamsViewComponent } from '../../exams/exams-view.component';
import { MatButton } from '@angular/material/button';

@Component({
  template: `
    <h3 mat-dialog-title i18n class="mat-subtitle-1">Review Previous Test Attempts</h3>
    <mat-dialog-content>
      @if (view==='list') {
        <planet-submissions [isDialog]="true" [parentId]="data.parentId"
          [displayedColumns]="[ 'lastUpdateTime', 'gradeTime', 'grade', 'status' ]" (submissionClick)="showSubmission($event)">
        </planet-submissions>
      }
      @if (view==='submission') {
        <planet-exams-view [isDialog]="true" [submission]="submission" [questionNum]="1" mode="view"></planet-exams-view>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      @if (view==='submission') {
        <button mat-stroked-button (click)="showList()" i18n>Back to submission list</button>
      }
      <button mat-dialog-close mat-raised-button color="primary" i18n>OK</button>
    </mat-dialog-actions>
    `,
  styles: [`
    h3.mat-mdc-dialog-title {
      text-align: center;
    }
  `],
  imports: [
    MatDialogTitle,
    CdkScrollable,
    MatDialogContent,
    SubmissionsComponent,
    ExamsViewComponent,
    MatDialogActions,
    MatButton,
    MatDialogClose
  ]
})
export class DialogsSubmissionsComponent {

  view: 'list' | 'submission' = 'list';
  submission: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  showSubmission(submission) {
    this.view = 'submission';
    this.submission = submission;
  }

  showList() {
    this.view = 'list';
  }

}
