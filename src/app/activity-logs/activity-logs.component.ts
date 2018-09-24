import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { UserService } from '../shared/user.service';

@Component({
  templateUrl: './activity-logs.component.html',
})
export class ActivityLogsComponent {

  message = '';
  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    // 'downloads',
    'views',
    'logins',
    'last_login',
    'last_upgrade',
    'last_sync'
  ];
  constructor(
    private couchService: CouchService,
    private userService: UserService
  ) {
    this.getLogs();
  }

  getLogs() {
    this.couchService.findAll('communityregistrationrequests',
      findDocuments({ 'parentCode': this.userService.getConfig().parentCode }, 0, [ { 'createdDate': 'desc' } ] ))
      .pipe(switchMap(com => {
        this.logs.data = com;
        return forkJoin([
          this.couchService.get('resource_activities/_design/resource_activities/_view/count_activity?group_level=3'),
          this.couchService.get('login_activities/_design/login_activities/_view/count_activity?group_level=3'),
          this.couchService.get('activity_logs/_design/activity_logs/_view/last_activity_by_type?group_level=3')
        ]);
      }))
      .subscribe((logs) => {
        this.logs.data = this.logs.data.map((c: any) => {
          c['resource_views'] = logs[0].rows.find(l => {
            return (l.key[0] === c.parentCode && l.key[1] === c.code && l.key[2] === 'visit');
          });
          c['resource_downloads'] = logs[0].rows.find(l => {
            return (l.key[0] === c.parentCode && l.key[1] === c.code && l.key[2] === 'download');
          });
          c['user_logins'] = logs[1].rows.find(l => {
            return (l.key[0] === c.parentCode && l.key[1] === c.code && l.key[2] === 'login');
          });
          c['last_sync'] = logs[2].rows.find(l => {
            return (l.key[2] === c.code && l.key[1] === c.parentCode && l.key[0] === 'sync');
          });
          c['last_upgrade'] = logs[2].rows.find(l => {
            return (l.key[2] === c.code && l.key[1] === c.parentCode && l.key[0] === 'upgrade');
          });
          c['last_login'] = logs[2].rows.find(l => {
            return (l.key[2] === c.code && l.key[1] === c.parentCode && l.key[0] === 'login');
          });
          return c;
        });
      }, (error) => this.message = 'There was a problem getting Activity Logs');
  }

}
