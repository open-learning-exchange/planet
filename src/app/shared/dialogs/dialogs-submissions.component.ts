import { Component, Inject } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA } from '@angular/material/legacy-dialog';

@Component({
  templateUrl: './dialogs-submissions.component.html',
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
