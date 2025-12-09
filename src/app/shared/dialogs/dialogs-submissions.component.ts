import { Component, Inject } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
  template: `
    <h3 mat-dialog-title i18n class="mat-subtitle-1">Review Previous Test Attempts</h3>
    <mat-dialog-content>
      <planet-submissions *ngIf="view==='list'" [isDialog]="true" [parentId]="data.parentId"
        [displayedColumns]="[ 'lastUpdateTime', 'gradeTime', 'grade', 'status' ]" (submissionClick)="showSubmission($event)">
      </planet-submissions>
      <ng-container *ngIf="view==='submission'">
        <planet-exams-view [isDialog]="true" [submission]="submission" [questionNum]="1" mode="view"></planet-exams-view>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button *ngIf="view==='submission'" mat-stroked-button (click)="showList()" i18n>Back to submission list</button>
      <button mat-dialog-close mat-raised-button color="primary" i18n>OK</button>
    </mat-dialog-actions>
  `,
  styles: [ `
    h3.mat-dialog-title {
      margin: 0
    }
  ` ]
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
