import { Component, Input, OnChanges, EventEmitter, Output, ViewChild } from '@angular/core';
import { Chart, ChartConfiguration, LineController } from 'chart.js';
import { StateService } from '../../shared/state.service';
import { HealthService } from '../../health/health.service';
import { generateWeeksArray, filterByDate, weekDataLabels, scaleLabel } from './reports.utils';
import { ReportsService } from './reports.service';
import { millisecondsToDay } from '../../meetups/constants';
import { dedupeShelfReduce, styleVariables } from '../../shared/utils';
import { conditions } from '../../health/health.constants';

Chart.register(LineController);

@Component({
  selector: 'planet-reports-health',
  templateUrl: './reports-health.component.html',
  styles: [ `
    div {
      display: grid;
      margin: 0.5rem 0;
      grid-gap: 0.25rem;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    }
    .chart-container {
      height: 30vh;
    }
    .trend-filters {
      margin: -1rem 0;
    }
    .trend-filters > span {
      align-self: center;
    }
  ` ]
})
export class ReportsHealthComponent implements OnChanges {

  @Input() planetCode = this.stateService.configuration.code;
  @Input() dateRange: { startDate: Date, endDate: Date };
  @Input() isActive: boolean;
  @Output() changeDateRange = new EventEmitter<{ startDate: Date, endDate: Date }>();
  @Output() updateHealthData = new EventEmitter<any[]>();
  @Output() healthLoadingChange = new EventEmitter<boolean>();
  @Output() healthNoDataChange = new EventEmitter<boolean>();
  @ViewChild('diagnosesChart') diagnosesChart;
  charts: any[] = [];
  showChart: boolean;
  examinations;
  weeklyHealthData = [];
  headlineData: { total: number, unique: string[], conditions: any };
  conditions = conditions;
  selectedCondition = 'COVID-19';
  isLoading = true;

  constructor(
    private reportsService: ReportsService,
    private stateService: StateService,
    private healthService: HealthService
  ) {}

  ngOnChanges(changes) {
    const weeks = generateWeeksArray(this.dateRange);
    if (this.planetCode && changes.planetCode && changes.planetCode.previousValue !== changes.planetCode.currentValue) {
      this.headlineData = null;
      this.healthLoadingChange.emit(true);
      this.healthService.getExaminations(this.planetCode).subscribe(examinations => {
        this.examinations = examinations;
        this.setHealthData(weeks);
      });
    } else if (changes.isActive && changes.isActive.currentValue === true && !this.examinations) {
      this.headlineData = null;
      this.healthLoadingChange.emit(true);
      this.healthService.getExaminations(this.planetCode).subscribe(examinations => {
        this.examinations = examinations;
        this.setHealthData(weeks);
      });
    } else if (this.examinations) {
      this.setHealthData(weeks);
    }
  }

  setHealthData(weeks: number[]) {
    const filteredExaminations = filterByDate(this.examinations, 'date', this.dateRange).map(examination => ({
      ...examination, conditions: examination.conditions || {}
    }));
    this.weeklyHealthData = this.reportsService.groupBy(
      filteredExaminations.map(examination => ({
        ...examination, weekOf: weeks.find(week => week > (examination.date - (millisecondsToDay * 7)))
      })),
      [ 'weekOf' ],
      { uniqueField: 'profileId', includeDocs: true }
    );
    this.headlineData = filteredExaminations.reduce((data, examination) => ({
      ...data,
      unique: [ ...data.unique, examination.profileId ].reduce(dedupeShelfReduce, []),
      conditions: conditions.reduce(
        (conditionObj, condition) => ({
          ...conditionObj, [condition]: (conditionObj[condition] || 0) + (examination.conditions[condition] === true ? 1 : 0)
        }),
        data.conditions
      )
    }), { total: filteredExaminations.length, unique: [], conditions: {} });
    this.healthLoadingChange.emit(false);
    this.healthNoDataChange.emit(filteredExaminations.length === 0);
    this.setWeeklyChart(this.selectedCondition);
  }

  showWeek(weekOf) {
    this.changeDateRange.emit({ startDate: new Date(weekOf), endDate: new Date(weekOf + (millisecondsToDay * 6)) });
  }

  setWeeklyChart(diagnosis: string) {
    if (this.weeklyHealthData.length === 0 || this.headlineData.conditions[diagnosis] === 0) {
      this.charts = [];
      this.showChart = false;
      return;
    }
    this.showChart = true;
    this.weeklyHealthData.sort((a, b) => a.weekOf - b.weekOf);
    const data = this.weeklyHealthData.map(week => week.docs.filter(doc => doc.conditions[diagnosis] === true).length);
    const labels = this.weeklyHealthData.map(week => weekDataLabels(week.weekOf));
    this.setChart({
      data: { labels, datasets: [ { label: diagnosis, data, borderColor: styleVariables.primary, lineTension: 0 } ] },
      chartName: 'diagnosesTrend'
    });
  }

  setChart({ data, chartName }) {
    const updateChart = this.charts.find(chart => chart.canvas.id === chartName);
    if (updateChart) {
      updateChart.data = data;
      updateChart.update();
      return;
    }
    if (!this.diagnosesChart) {
      setTimeout(() => this.setChart({ data, chartName }));
      return;
    }
    const chartConfig: ChartConfiguration<'line'> = {
      type: 'line',
      data,
      options: {
        plugins: {
          title: { display: false },
          legend: { display: false }
        },
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            ticks: {  precision: 0 }
          },
          x: { title: { display: true, text: 'Week of' } }
        },
      }
    };
    this.charts.push(new Chart(this.diagnosesChart.nativeElement.getContext('2d'), chartConfig));
  }

  onSelectedConditionChange(condition) {
    this.selectedCondition = condition;
    this.setWeeklyChart(condition);
  }

}
