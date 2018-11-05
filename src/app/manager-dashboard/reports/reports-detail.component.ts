import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { map } from 'rxjs/operators';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { Chart } from 'chart.js';
import { styleVariables, dedupeShelfReduce } from '../../shared/utils';

@Component({
  templateUrl: './reports-detail.component.html',
  styleUrls: [ 'reports-detail.scss' ]
})
export class ReportsDetailComponent {

  parentCode = '';
  planetCode = '';
  reports: any = {};
  charts: Chart[] = [];

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute
  ) {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const codeParam = params.get('code');
      this.planetCode = codeParam || this.stateService.configuration.code;
      this.parentCode = params.get('parentCode') || this.stateService.configuration.parentCode;
      this.initializeData(!codeParam);
    });
  }

  initializeData(local: boolean) {
    this.getTotalUsers(local).subscribe(() => {
      this.getLoginActivities();
      this.getRatingInfo();
      this.getResourceVisits();
      this.getPlanetCounts();
    });
  }

  getTotalUsers(local: boolean) {
    return this.activityService.getTotalUsers(this.planetCode, local).pipe(map(({ count, byGender, byMonth }) => {
      this.reports.totalUsers = count;
      this.reports.usersByGender = byGender;
      // this.setChart('Registrations', byMonth.map((visit: any) => ({
      //   x: new Date(visit.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      //   y: visit.count
      // })));
    }));
  }

  getLoginActivities() {
    this.activityService.getLoginActivities(this.planetCode).subscribe(({ byUser, byMonth }: { byUser: any[], byMonth: any[] }) => {
      this.reports.visits = byUser.slice(0, 5);
      this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'visitChart' });
      this.setChart({ ...this.setGenderDatasets(byMonth, true), chartName: 'uniqueVisitChart' });
      // this.setChart('Visits', byMonth.map((visit: any) => ({
      //   x: new Date(visit.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      //   y: visit.count
      // })));
    });
  }

  getRatingInfo() {
    this.activityService.getRatingInfo(this.planetCode).subscribe((averageRatings) => {
      this.reports.resourceRatings = averageRatings.filter(item => item.type === 'resource').slice(0, 5);
      this.reports.courseRatings = averageRatings.filter(item => item.type === 'course').slice(0, 5);
    });
  }

  getResourceVisits() {
    this.activityService.getResourceVisits(this.planetCode).subscribe(({ byResource, byMonth }) => {
      this.reports.resources = byResource.sort((a, b) => b.count - a.count).slice(0, 5);
      this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'resourceViewChart' });
    });
  }

  getPlanetCounts() {
    this.activityService.getDatabaseCount('resources').subscribe(count => this.reports.totalResources = count);
    this.activityService.getDatabaseCount('courses').subscribe(count => this.reports.totalCourses = count);
  }

  xyChartData(data, unique) {
    return data.map((visit: any) => ({
      x: this.monthDataLabels(visit.date),
      y: unique ? visit.unique.length : visit.count || 0
    }));
  }

  monthDataLabels(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  uniqueMonths(data) {
    return data.map((datum: any) => datum.date).reduce(dedupeShelfReduce, []);
  }

  datasetObject(label, data, backgroundColor) {
    return { label, data, backgroundColor, stack: 1 }
  }

  setGenderDatasets(data, unique = false) {
    const uniqueMonths = this.uniqueMonths(data);
    const genderFilter = (gender: string) =>
      uniqueMonths.map((month) => data.find((datum: any) => datum.gender === gender && datum.date === month) || { date: month, unique: [] });
    return ({
      data: {
        datasets: [
          this.datasetObject('Male', this.xyChartData(genderFilter('male'), unique), styleVariables.primaryLight),
          this.datasetObject('Female', this.xyChartData(genderFilter('female'), unique), styleVariables.accentLight),
          this.datasetObject('Did not specify', this.xyChartData(genderFilter(undefined), unique), styleVariables.grey)
        ]
      },
      labels: uniqueMonths.map(month => this.monthDataLabels(month))
    });
  }

  setChart({ data, labels, chartName }) {
    this.charts.push(new Chart(chartName, {
      type: 'bar',
      data,
      options: {
        title: { display: true, text: this.titleOfChartName(chartName), fontSize: 16 },
        legend: { position: 'bottom' },
        maintainAspectRatio: false,
        scales: {
          xAxes: [ { labels, type: 'category', stacked: true } ],
          yAxes: [ {
            type: 'linear',
            ticks: { beginAtZero: true, precision: 0, suggestedMax: 10 }
          } ]
        }
      }
    }));
  }

  titleOfChartName(chartName: string) {
    const chartNames = {
      resourceViewChart: 'Resource Views',
      visitChart: 'Total Visits',
      uniqueVisitChart: 'Unique Member Visits'
    }
    return chartNames[chartName];
  }

}
