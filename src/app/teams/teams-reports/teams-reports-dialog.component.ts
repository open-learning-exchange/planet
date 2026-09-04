import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { TeamsReportsDetailComponent } from './teams-reports-detail.component';
import { MatButton } from '@angular/material/button';
import { DatePipe } from '@angular/common';

@Component({
  templateUrl: './teams-reports-dialog.component.html',
  styles: [`
    h3 {
      margin: 0;
    }
    .mat-subtitle-2 {
      margin-top: 0;
    }
  `],
  imports: [
    MatDialogTitle, CdkScrollable, MatDialogContent, TeamsReportsDetailComponent, MatDialogActions, MatButton, MatDialogClose, DatePipe
  ]
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
