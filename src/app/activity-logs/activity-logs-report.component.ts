import { Component } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
      this.couchService.get('ratings/_design/ratings/_view/avg_ratings?group_level=4'
         + '&Key=["' + this.parentCode + '", "' + this.planetCode + '", "resource"]'),
      this.couchService.get('resource_activities/_design/resource_activities/_view/count_activity?group_level=4'
         + '&Key=["' + this.parentCode + '", "' + this.planetCode + '", "visit"]')
    ]).pipe(switchMap(logs  => {
      this.reports.total_users = logs[0].rows.map(l => {
        this.reports.users[l.key[2] || 'other'] = l.value;
        return l.value;
      }).reduce((a, b) => a + b, 0);
      this.reports.visits = logs[1].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5);
      this.reports.ratings = logs[2].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5);
      this.reports.resources = logs[3].rows.sort(function(a, b) {
        return b.value - a.value;
      }).slice(0, 5);
      return of(false);
    })).subscribe((res) => {
    }, (error) => this.message = 'There was a problem getting Activity Logs');
  }

}
