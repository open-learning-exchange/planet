import { Component, Input, OnChanges } from '@angular/core';
import { StateService } from '../shared/state.service';
import { MatDivider } from '@angular/material/list';
import { NgFor, NgIf, NgClass, CurrencyPipe, DatePipe } from '@angular/common';
import { PlanetMarkdownComponent } from '../shared/planet-markdown.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-teams-reports-detail',
  templateUrl: './teams-reports-detail.component.html',
  styleUrls: ['./teams-reports-detail.scss'],
  imports: [MatDivider, NgIf, NgFor, NgClass, PlanetMarkdownComponent, CurrencyPipe, DatePipe]
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
    private stateService: StateService
  ) {}

  ngOnChanges() {
    this.expenses = this.num(this.report.wages) + this.num(this.report.otherExpenses);
    this.income = this.num(this.report.sales) + this.num(this.report.otherIncome);
    this.net = this.income - this.expenses;
    this.endingBalance = this.net + this.num(this.report.beginningBalance);
    this.receiptImages = this.getReceiptImages(this.report);
  }

  private getReceiptImages(report) {
    return (Object.entries(report?._attachments || {}) as [ string, any ][])
      .filter(([ , attachment ]) => attachment?.content_type?.startsWith('image/'))
      .sort(([ a ], [ b ]) => a.localeCompare(b))
      .map(([ attachmentKey ]) => ({
        key: attachmentKey,
        url: `${environment.couchAddress}/teams/${report._id}/${encodeURIComponent(attachmentKey)}`
      }));
  }

  private num(value: any): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

}
