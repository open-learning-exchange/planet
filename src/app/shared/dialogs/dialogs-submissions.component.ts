import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  templateUrl: './dialogs-submissions.component.html',
  styles: [ `
    h3.mat-mdc-dialog-title {
      text-align: center;
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
