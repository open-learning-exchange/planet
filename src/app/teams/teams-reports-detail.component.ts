import { Component, Input, OnChanges } from '@angular/core';
import { StateService } from '../shared/state.service';

@Component({
  selector: 'planet-teams-reports-detail',
  templateUrl: './teams-reports-detail.component.html',
  styles: [ `
    .report-grid {
      display: grid;
      grid-template-columns: 250px auto;
      grid-row-gap: 0.25rem;
    }
    .report-grid .full-width {
      grid-column: 1 / -1;
    }
    .report-grid .mat-divider-horizontal {
      position: initial;
    }
  ` ]
})
export class TeamsReportsDetailComponent implements OnChanges {

  @Input() report;
  @Input() showSummary = false;
  expenses: number;
  income: number;
  net: number;
  endingBalance: number;
  curCode = this.stateService.configuration.currency || {};

  constructor(
    private stateService: StateService
  ) {}

  ngOnChanges() {
    this.expenses = this.report.wages + this.report.otherExpenses;
    this.income = this.report.sales + this.report.otherIncome;
    this.net = this.income - this.expenses;
    this.endingBalance = this.net + this.report.beginningBalance;
  }

}
