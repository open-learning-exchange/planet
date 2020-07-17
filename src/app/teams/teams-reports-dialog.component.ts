import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  templateUrl: './teams-reports-dialog.component.html',
  styles: [ `
    .report-grid {
      display: grid;
      grid-template-columns: 250px auto;
      grid-row-gap: 0.25rem;
    }
    .report-grid .full-width {
      grid-column: 1 / -1;
    }
    h3 {
      margin-bottom: 0;
    }
    .mat-subheading-1 {
      margin-top: 0;
    }
  ` ]
})
export class TeamsReportsDialogComponent {

  report: any = {};
  expenses: number;
  income: number;
  net: number;
  endingBalance: number;
  teamName: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.report = this.data.report;
    this.expenses = this.report.wages + this.report.otherExpenses;
    this.income = this.report.sales + this.report.otherIncome;
    this.net = this.income - this.expenses;
    this.endingBalance = this.net + this.report.beginningBalance;
    this.teamName = this.data.team.name;
  }

}
