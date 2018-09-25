import { Component } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';

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
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute
  ) {
    this.route.data.subscribe((data: any) => {
      this.planetCode =  data.code || this.userService.getConfig().code;
      this.parentCode =  data.parentCode || this.userService.getConfig().parentCode;
    });
    this.getLogs();
  }

  getLogs() {
    forkJoin([
      this.couchService.get('_users/_design/users/_view/count_by_gender?group_level=3'),
      this.couchService.get('login_activities/_design/login_activities/_view/count_activity?group_level=4'
        + '&Key=["' + this.parentCode + '", "' + this.planetCode + '", "login"]'),
      this.couchService.post('ratings/_design/ratings/_view/avg_ratings/queries',
      { 'queries': [
        {
          group_level: 4,
          startkey: [ this.parentCode, this.planetCode, 'resource', '0' ],
          endkey: [ this.parentCode, this.planetCode, 'resource', {} ]
        }, {
          group_level: 4,
          startkey: [ this.parentCode, this.planetCode, 'course', '0' ],
          endkey: [ this.parentCode, this.planetCode, 'course', {} ]
        }
      ] }),
      this.couchService.get('resource_activities/_design/resource_activities/_view/count_activity?group_level=4'
        + '&Key=["' + this.parentCode + '", "' + this.planetCode + '", "visit"]'),
      this.couchService.get('resources/_design_docs'),
      this.couchService.get('courses/_design_docs')
    ]).pipe(switchMap(logs  => {
      this.reports.totalUsers = logs[0].rows.map(l => {
        this.reports.users[l.key[2] || 'other'] = l.value;
        return l.value;
      }).reduce((a, b) => a + b, 0);
      this.reports.visits = logs[1].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5);
      this.reports.resourceRatings = logs[2].results[0].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5).map((r: any) => {
        this.resources.push(r.key[3]);
        return r;
      });
      this.reports.courseRatings = logs[2].results[1].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5).map((r: any) => {
        this.courses.push(r.key[3]);
        return r;
      });
      this.reports.resources = logs[3].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5).map((r: any) => {
        this.resources.push(r.key[3]);
        return r;
      });
      this.reports.totalResources = logs[4].total_rows - logs[4].rows.length;
      this.reports.totalCourses = logs[5].total_rows - logs[5].rows.length;
      return forkJoin([
        this.couchService.post('resources/_find', { 'selector': { '_id': { '$in': this.resources } } }),
        this.couchService.post('courses/_find', { 'selector': { '_id': { '$in': this.courses } } })
      ]);
    })).subscribe(([ res, cor ]) => {
      console.log(res, cor);
      this.reports.resourceRatings = this.reports.resourceRatings.map((rate: any) => {
        rate.item = res.docs.find((r: any) => r._id === rate.key[3]);
        return rate;
      });
      this.reports.courseRatings = this.reports.courseRatings.map((rate: any) => {
        rate.item = cor.docs.find((r: any) => r._id === rate.key[3]);
        return rate;
      });
      this.reports.resources = this.reports.resources.map((visit: any) => {
        visit.item = res.docs.find((r: any) => r._id === visit.key[3]);
        return visit;
      });
    }, (error) => this.message = 'There was a problem getting Activity Logs');
  }

}
