import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  templateUrl: './teams-reports-dialog.component.html',
  styles: [ `
    h3 {
      margin-bottom: 0;
    }
    .mat-subtitle-2 {
      margin-top: 0;
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
