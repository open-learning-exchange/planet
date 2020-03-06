import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  template: `
    <mat-dialog-content>
      <planet-submissions *ngIf="view==='list'" [isDialog]="true" [parentId]="data.parentId" (submissionClick)="showSubmission($event)"></planet-submissions>
      <ng-container *ngIf="view==='submission'">
        <planet-exams-view [isDialog]="true" [submission]="submission" [questionNum]="1" mode="view"></planet-exams-view>
      </ng-container>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button *ngIf="view==='submission'" mat-stroked-button (click)="showList()" i18n>Back to submission list</button>
      <button mat-dialog-close mat-raised-button color="primary" i18n>OK</button>
    </mat-dialog-actions>
  `
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
