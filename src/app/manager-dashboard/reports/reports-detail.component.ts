import { Component, OnInit, OnDestroy, ViewEncapsulation, HostBinding } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { combineLatest, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';
import { Chart } from 'chart.js';
import { styleVariables } from '../../shared/utils';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { CsvService } from '../../shared/csv.service';

@Component({
  templateUrl: './reports-detail.component.html',
  styleUrls: [ 'reports-detail.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class ReportsDetailComponent implements OnInit, OnDestroy {

  @HostBinding('class') readonly hostClass = 'manager-reports-detail';
  parentCode = '';
  planetCode = '';
  planetName = '';
  reports: any = {};
  charts: Chart[] = [];
  onDestroy$ = new Subject<void>();
  filter = '';
  codeParam = '';
  loginActivities = [];
  resourceActivities = [];

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute,
    private dialogsLoadingService: DialogsLoadingService,
    private csvService: CsvService
  ) {}

  ngOnInit() {
    const dbName = 'communityregistrationrequests';
    this.dialogsLoadingService.start();
    combineLatest(this.route.paramMap, this.stateService.couchStateListener(dbName)).pipe(takeUntil(this.onDestroy$))
    .subscribe(([ params, planetState ]: [ ParamMap, any ]) => {
      if (planetState === undefined) {
        return;
      }
      const planets = this.activityService.attachNamesToPlanets((planetState && planetState.newData) || []);
      this.codeParam = params.get('code');
      const planet = planets.find((p: any) => p.doc.code === this.codeParam);
      this.planetCode = this.codeParam || this.stateService.configuration.code;
      this.parentCode = params.get('parentCode') || this.stateService.configuration.parentCode;
      this.planetName = planet ? (planet.nameDoc && planet.nameDoc.name) || planet.doc.name : this.stateService.configuration.name;
      this.initializeData(!this.codeParam);
    });
    this.stateService.requestData(dbName, 'local');
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onFilterChange(filterValue: string) {
    this.filter = filterValue;
    this.initializeData(!this.codeParam);
  }

  initializeData(local: boolean) {
    this.getTotalUsers(local).subscribe(() => {
      this.getLoginActivities();
      this.getRatingInfo();
      this.getResourceVisits();
      this.getPlanetCounts(local);
      this.dialogsLoadingService.stop();
    });
  }

  getTotalUsers(local: boolean) {
    return this.activityService.getTotalUsers(this.planetCode, local).pipe(map(({ count, byGender, byMonth }) => {
      this.reports.totalUsers = count;
      this.reports.usersByGender = byGender;
    }));
  }

  getLoginActivities() {
    this.activityService.getLoginActivities(this.activityParams()).subscribe((loginActivities: any) => {
      this.loginActivities = loginActivities;
      const { byUser, byMonth } = this.activityService.groupLoginActivities(loginActivities);
      this.reports.totalMemberVisits = byUser.reduce((total, resource: any) => total + resource.count, 0);
      this.reports.visits = byUser.slice(0, 5);
      this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'visitChart' });
      this.setChart({ ...this.setGenderDatasets(byMonth, true), chartName: 'uniqueVisitChart' });
    });
  }

  getRatingInfo() {
    this.activityService.getRatingInfo(this.activityParams()).subscribe((averageRatings) => {
      this.reports.resourceRatings = averageRatings.filter(item => item.type === 'resource').slice(0, 5);
      this.reports.courseRatings = averageRatings.filter(item => item.type === 'course').slice(0, 5);
    });
  }

  getResourceVisits() {
    this.activityService.getResourceVisits(this.activityParams()).subscribe((resourceActivities: any) => {
      this.resourceActivities = resourceActivities;
      const { byResource, byMonth } = this.activityService.groupResourceVisits(resourceActivities);
      this.reports.totalResourceViews = byResource.reduce((total, resource: any) => total + resource.count, 0);
      this.reports.resources = byResource.sort((a, b) => b.count - a.count).slice(0, 5);
      this.setChart({ ...this.setGenderDatasets(byMonth), chartName: 'resourceViewChart' });
    });
  }

  getPlanetCounts(local: boolean) {
    if (local) {
      this.activityService.getDatabaseCount('resources').subscribe(count => this.reports.totalResources = count);
      this.activityService.getDatabaseCount('courses').subscribe(count => this.reports.totalCourses = count);
    } else {
      this.activityService.getChildDatabaseCounts(this.planetCode).subscribe((response: any) => {
        this.reports.totalResources = response.totalResources;
        this.reports.totalCourses = response.totalCourses;
      });
    }
  }

  xyChartData(data, unique) {
    return data.map((visit: any) => ({
      x: this.monthDataLabels(visit.date),
      y: unique ? visit.unique.length : visit.count || 0
    }));
  }

  monthDataLabels(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  datasetObject(label, data, backgroundColor) {
    return { label, data, backgroundColor };
  }

  setGenderDatasets(data, unique = false) {
    const months = this.setMonths();
    const genderFilter = (gender: string) =>
      months.map((month) =>
        data.find((datum: any) => datum.gender === gender && datum.date === month) || { date: month, unique: [] }
      );
    const monthlyObj = (month) => {
      const monthlyData = data.filter((datum: any) => datum.date === month);
      return ({
        count: monthlyData.reduce((count: number, datum: any) => count + datum.count, 0),
        unique: monthlyData.reduce((allUnique: string[], datum: any) => allUnique.concat(datum.unique), [])
      });
    };
    const totals = () => months.map((month) => ({ date: month, ...monthlyObj(month) }));
    return ({
      data: {
        datasets: [
          this.datasetObject('Male', this.xyChartData(genderFilter('male'), unique), styleVariables.primaryLighter),
          this.datasetObject('Female', this.xyChartData(genderFilter('female'), unique), styleVariables.accentLighter),
          this.datasetObject('Did not specify', this.xyChartData(genderFilter(undefined), unique), styleVariables.grey),
          this.datasetObject('Total', this.xyChartData(totals(), unique), styleVariables.primary)
        ]
      },
      labels: months.map(month => this.monthDataLabels(month))
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
          xAxes: [ { labels, type: 'category' } ],
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
      resourceViewChart: 'Resource Views by Month',
      visitChart: 'Total Member Visits by Month',
      uniqueVisitChart: 'Unique Member Visits by Month'
    };
    return chartNames[chartName];
  }

  setMonths() {
    // Added this in as a minimum for reporting to ignore incorrect data, should be deleted after resolved
    const planetLaunchDate = new Date(2018, 6, 1).valueOf();
    const now = new Date();
    return Array(12).fill(1)
      .map((val, index: number) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1).valueOf())
      .filter((month: number) => month > planetLaunchDate);
  }

  activityParams(): { planetCode, filterAdmin?, fromMyPlanet? } {
    return { planetCode: this.planetCode, filterAdmin: true, ...(this.filter ? { fromMyPlanet: this.filter === 'myplanet' } : {}) };
  }

  exportCSV(reportType: 'logins' | 'resourceViews') {
    this.csvService.exportCSV(reportType === 'logins' ?
      { data: this.loginActivities, title: 'Member Visits' } :
      { data: this.resourceActivities, title: 'Resource Views' }
    );
  }
}
