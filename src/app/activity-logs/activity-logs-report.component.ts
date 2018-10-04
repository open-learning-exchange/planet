import { Component } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { UserService } from '../shared/user.service';
import { ActivityService } from './activity.service';
import { ConfigurationService } from '../configuration/configuration.service';

@Component({
  templateUrl: './activity-logs-report.component.html',
})
export class ActivityLogsReportComponent {

  parentCode = '';
  planetCode = '';
  reports: any = {};
  resources = [];
  courses = [];

  constructor(
    private activityService: ActivityService,
    private configurationService: ConfigurationService,
    private route: ActivatedRoute
  ) {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.planetCode = params.get('code') || this.configurationService.configuration.code;
      this.parentCode = params.get('parentCode') || this.configurationService.configuration.parentCode;
    });
    this.getTotalUsers();
    this.getLoginActivities();
    this.getRatingInfo();
    this.getResourceVisits();
    this.getPlanetCounts();
  }

  getTotalUsers() {
    this.activityService.getTotalUsers(this.planetCode).subscribe(({ count, byGender }) => {
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
