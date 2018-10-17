import { Component } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { ReportsService } from './reports.service';
import { StateService } from '../../shared/state.service';

@Component({
  templateUrl: './reports-detail.component.html',
})
export class ReportsDetailComponent {

  parentCode = '';
  planetCode = '';
  reports: any = {};

  constructor(
    private activityService: ReportsService,
    private stateService: StateService,
    private route: ActivatedRoute
  ) {
    this.route.paramMap.subscribe((params: ParamMap) => {
      const codeParam = params.get('code');
      this.planetCode = codeParam || this.stateService.configuration.code;
      this.parentCode = params.get('parentCode') || this.stateService.configuration.parentCode;
      this.initializeData(codeParam === undefined);
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
    this.activityService.getLoginActivities(this.planetCode).subscribe(visits => {
      this.reports.visits = visits.slice(0, 5);
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

}
