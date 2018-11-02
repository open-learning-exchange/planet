import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { Chart } from 'chart.js';
import { styleVariables } from '../../shared/utils';

@Component({
  templateUrl: './reports-detail.component.html',
  styleUrls: [ 'reports-detail.scss' ]
})
export class ReportsDetailComponent {

  parentCode = '';
  planetCode = '';
  reports: any = {};
  chart: Chart;

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
    this.getTotalUsers(local);
    this.getLoginActivities();
    this.getRatingInfo();
    this.getResourceVisits();
    this.getPlanetCounts();
  }

  getTotalUsers(local: boolean) {
    this.activityService.getTotalUsers(this.planetCode, local).subscribe(({ count, byGender }) => {
      this.reports.totalUsers = count;
      this.reports.usersByGender = byGender;
    });
  }

  getLoginActivities() {
    this.activityService.getLoginActivities(this.planetCode).subscribe(({ byUser, byMonth }: { byUser: any[], byMonth: any[] }) => {
      this.reports.visits = byUser.slice(0, 5);
      this.setChart('Visits', byMonth.map((visit: any) => ({
        x: new Date(visit.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        y: visit.count
      })));
    });
  }

  getRatingInfo() {
    this.activityService.getRatingInfo(this.planetCode).subscribe((averageRatings) => {
      this.reports.resourceRatings = averageRatings.filter(item => item.type === 'resource').slice(0, 5);
      this.reports.courseRatings = averageRatings.filter(item => item.type === 'course').slice(0, 5);
    });
  }

  getResourceVisits() {
    this.activityService.getResourceVisits(this.planetCode).subscribe(resourceVisits => {
      this.reports.resources = resourceVisits.sort((a, b) => b.count - a.count).slice(0, 5);
    });
  }

  getPlanetCounts() {
    this.activityService.getDatabaseCount('resources').subscribe(count => this.reports.totalResources = count);
    this.activityService.getDatabaseCount('courses').subscribe(count => this.reports.totalCourses = count);
  }

  setChart(label: string, data: any[]) {
    this.chart = new Chart('reportsChart', {
      type: 'bar',
      data: {
        datasets: [ {
          label,
          data,
          backgroundColor: styleVariables.primaryLight
        } ]
      },
      options: {
        maintainAspectRatio: false,
        scales: {
          xAxes: [ {
            labels: data.map(datum => datum.x),
            type: 'category',
          } ],
          yAxes: [ {
            type: 'linear',
            ticks: {
              beginAtZero: true,
              precision: 0,
              suggestedMax: 10
            }
          } ]
        }
      }
    });
  }

}
