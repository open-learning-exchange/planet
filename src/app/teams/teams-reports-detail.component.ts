import { Component, Input, OnChanges } from '@angular/core';
import { StateService } from '../shared/state.service';
import { MatDivider } from '@angular/material/list';
import { NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { PlanetMarkdownComponent } from '../shared/planet-markdown.component';
import { TeamsAttachmentsService } from './teams-attachments.service';

@Component({
  selector: 'planet-teams-reports-detail',
  templateUrl: './teams-reports-detail.component.html',
  styleUrls: ['./teams-reports-detail.scss'],
  imports: [MatDivider, NgClass, PlanetMarkdownComponent, CurrencyPipe, DatePipe]
})
export class TeamsReportsDetailComponent implements OnChanges {

  @Input() report;
  @Input() showSummary = false;
  receiptImages: any[] = [];
  expenses: number;
  income: number;
  net: number;
  endingBalance: number;
  curCode = this.stateService.configuration.currency || {};

  constructor(
    private stateService: StateService,
    private teamsAttachmentsService: TeamsAttachmentsService
  ) {}

  ngOnChanges() {
    this.expenses = this.report.wages + this.report.otherExpenses;
    this.income = this.report.sales + this.report.otherIncome;
    this.net = this.income - this.expenses;
    this.endingBalance = this.net + this.report.beginningBalance;
    this.receiptImages = this.teamsAttachmentsService.receiptAttachments(this.report);
  }

}
