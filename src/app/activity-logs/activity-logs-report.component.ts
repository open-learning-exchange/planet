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

  message = '';
  parentCode = '';
  planetCode = '';
  reports: any = { users: { } };
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

  // getLogs() {
  //   forkJoin([
  //     this.couchService.findAll('_users'),
  //     this.couchService.findAll('login_activities'),
  //     this.couchService.findAll('ratings'),
  //     this.couchService.findAll('resource_activities'),
  //     this.couchService.get('resources/_design_docs'),
  //     this.couchService.get('courses/_design_docs')
  //   ]).pipe(switchMap(([ users, loginActivites, ratings, resourceActivities, resourceInfo, courseInfo ]: any[]) => {
  //     this.reports.totalUsers = logs[0].rows.map(l => {
  //       this.reports.users[l.key[2] || 'other'] = l.value;
  //       return l.value;
  //     }).reduce((a, b) => a + b, 0);
  //     this.reports.visits = logs[1].rows.sort(function(a, b) {
  //       return b.value - a.value;
  //     }).slice(0, 5);
  //     this.reports.resourceRatings = logs[2].results[0].rows.sort(function(a, b) {
  //       return b.value - a.value;
  //     }).slice(0, 5).map((r: any) => {
  //       this.resources.push(r.key[3]);
  //       return r;
  //     });
  //     this.reports.courseRatings = logs[2].results[1].rows.sort(function(a, b) {
  //       return b.value - a.value;
  //     }).slice(0, 5).map((r: any) => {
  //       this.courses.push(r.key[3]);
  //       return r;
  //     });
  //     this.reports.resources = logs[3].rows.sort(function(a, b) {
  //       return b.value - a.value;
  //     }).slice(0, 5).map((r: any) => {
  //       this.resources.push(r.key[3]);
  //       return r;
  //     });
  //     this.reports.totalResources = logs[4].total_rows - logs[4].rows.length;
  //     this.reports.totalCourses = logs[5].total_rows - logs[5].rows.length;
  //     return forkJoin([
  //       this.couchService.post('resources/_find', { 'selector': { '_id': { '$in': this.resources } } }),
  //       this.couchService.post('courses/_find', { 'selector': { '_id': { '$in': this.courses } } })
  //     ]);
  //   })).subscribe(([ res, cor ]) => {
  //     console.log(res, cor);
  //     this.reports.resourceRatings = this.reports.resourceRatings.map((rate: any) => {
  //       rate.item = res.docs.find((r: any) => r._id === rate.key[3]);
  //       return rate;
  //     });
  //     this.reports.courseRatings = this.reports.courseRatings.map((rate: any) => {
  //       rate.item = cor.docs.find((r: any) => r._id === rate.key[3]);
  //       return rate;
  //     });
  //     this.reports.resources = this.reports.resources.map((visit: any) => {
  //       visit.item = res.docs.find((r: any) => r._id === visit.key[3]);
  //       return visit;
  //     });
  //   }, (error) => this.message = 'There was a problem getting Activity Logs');
  // }

}
