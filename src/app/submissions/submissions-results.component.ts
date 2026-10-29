import { Component, Input, OnChanges } from '@angular/core';
import type { ChartDataset, ChartOptions } from 'chart.js';

import { chartColors } from '@shared/charts/chart.utils';
import { PlanetChartComponent, PlanetChartType } from '@shared/charts/planet-chart.component';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';

import { SubmissionsService } from './submissions.service';

interface QuestionChart {
  index: number;
  body: string;
  type: PlanetChartType;
  labels: string[];
  datasets: ChartDataset[];
  options: ChartOptions;
  isMultiSelect: boolean;
}

const chartableTypes = [ 'select', 'selectMultiple', 'ratingScale' ];

@Component({
  selector: 'planet-submissions-results',
  templateUrl: './submissions-results.component.html',
  styleUrls: [ './submissions-results.component.scss' ],
  imports: [ PlanetChartComponent, PlanetMarkdownComponent ]
})
export class SubmissionsResultsComponent implements OnChanges {

  @Input() survey: any;
  @Input() submissions: any[] = [];
  questionCharts: QuestionChart[] = [];

  constructor(private submissionsService: SubmissionsService) {}

  ngOnChanges() {
    this.questionCharts = (this.survey?.questions || [])
      .map((question, index) => ({ ...question, index }))
      .filter(question => chartableTypes.includes(question.type))
      .map(question => this.questionChart(question));
  }

  private questionChart(question): QuestionChart {
    const isMultiSelect = question.type === 'selectMultiple';
    const { labels, data, chartType } = this.submissionsService.aggregateQuestionResponses(
      question, this.submissions, isMultiSelect ? 'percent' : 'count'
    );
    const isBar = chartType === 'bar';
    return {
      index: question.index,
      body: question.body,
      type: isBar ? 'bar' : 'doughnut',
      labels,
      datasets: [ { data, backgroundColor: chartColors(labels.length) } ],
      options: isBar ? this.barOptions(question.type === 'ratingScale', isMultiSelect) : {},
      isMultiSelect
    };
  }

  private barOptions(isRatingScale: boolean, isPercent: boolean): ChartOptions {
    return {
      plugins: { legend: { display: false } },
      scales: {
        x: { title: { display: true, text: isRatingScale ? $localize`Rating` : $localize`Choice` } },
        y: {
          beginAtZero: true,
          max: isPercent ? 100 : undefined,
          ticks: { precision: 0 },
          title: { display: true, text: isRatingScale ? $localize`Number of responses` : $localize`% of responders` }
        }
      }
    };
  }

}
