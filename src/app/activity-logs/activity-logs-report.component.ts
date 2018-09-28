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
    this.getTotalUsers();
    this.getLoginActivities();
    this.getRatingInfo();
    this.getResourceVisits();
    this.getPlanetCounts();
  }

  groupBy(array, field, sumField?) {
    return array.reduce((group, item) => {
      const key = item[field];
      const currentValue = group.find((groupItem) => groupItem.key === key);
      if (currentValue) {
        currentValue.count = currentValue.count + 1;
        currentValue.sum = sumField ? currentValue[sumField] + item[sumField] : 0;
      } else {
        group.push({ key, count: 1, sum: sumField ? item[sumField] : 0 });
      }
      return group;
    }, []);
  }

  getTotalUsers() {
    this.couchService.findAll('_users').subscribe((users: any) => {
      this.reports.totalUsers = users.length;
      this.reports.usersByGender = users.reduce((usersByGender: any, user: any) => {
        usersByGender[user.gender || 'undeclared'] += 1;
        return usersByGender;
      }, { 'male': 0, 'female': 0, 'undeclared': 0 });
    });
  }

  getLoginActivities() {
    this.couchService.findAll('login_activities').subscribe((loginActivities: any) => {
      this.reports.visits = this.groupBy(loginActivities, 'user').sort((a, b) => b.count - a.count).slice(0, 5);
    });
  }

  getRatingInfo() {
    this.couchService.findAll('ratings').subscribe((ratings: any) => {
      const groupedRatings = this.groupBy(ratings, 'item', 'rate').sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count));
      this.reports.resourceRatings = this.groupBy(ratings.filter((rating: any) => rating.type === 'resource'), 'item', 'rate')
        .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).slice(0, 5).map((r: any) => ({ ...r, value: r.sum / r.count }));
      this.reports.courseRatings = this.groupBy(ratings.filter((rating: any) => rating.type === 'course'), 'item', 'rate')
        .sort((a: any, b: any) => (b.sum / b.count) - (a.sum / a.count)).slice(0, 5).map((r: any) => ({ ...r, value: r.sum / r.count }));
    });
  }

  getResourceVisits() {
    this.couchService.findAll('resource_activities').subscribe((resourceActivites) => {
      this.reports.resources = this.groupBy(resourceActivites, 'resource').sort((a, b) => b.count - a.count).slice(0, 5);
    });
  }

  getPlanetCounts() {
    const totalDocs = (response: any) => response.total_rows - response.rows.length;
    this.couchService.get('resources/_design_docs').subscribe((res) => {
      this.reports.totalResources = totalDocs(res);
    });
    this.couchService.get('courses/_design_docs').subscribe((res) => {
      this.reports.totalCourses = totalDocs(res);
    });
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
