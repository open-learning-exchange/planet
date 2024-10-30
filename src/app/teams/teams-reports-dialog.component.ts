import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  templateUrl: './teams-reports-dialog.component.html',
  styles: [ `
    h3 {
      margin-bottom: 0;
    }
    .mat-subheading-1 {
      margin-top: 0;
    }
    .close-button {
      color: white;
      box-shadown:none !important;
      filter: none !important;
      outline: none !important;
    }
    .close-button:hover,
    .close-button:focus,
    .close-button:active {
      box-shadow: none !important;
      filter: none !important;
    }
  ` ]
})
export class TeamsReportsDialogComponent {

  report: any = {};
  teamName: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.report = this.data.report;
    this.teamName = this.data.team.name;
  }

}
