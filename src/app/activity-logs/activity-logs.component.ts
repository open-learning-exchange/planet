import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  templateUrl: './activity-logs.component.html',
})
export class ActivityLogsComponent implements OnInit {

  message = '';
  logs = new MatTableDataSource();
  displayedColumns = [
    'name',
    'ratings',
    'activity'
  ];
  constructor(
    private couchService: CouchService
  ) { }

  ngOnInit() {
    this.couchService.findAll('communityregistrationrequests',
      findDocuments({ '_id': { '$gt': null } }, 0, [ { 'createdDate': 'desc' } ] ))
      .pipe(switchMap(data => {
        this.logs.data = data;
        return forkJoin([
          this.couchService.get('resource_activities/_design/resource_activities/_view/count_activity?group_level=2'),
          this.couchService.get('ratings/_design/ratings/_view/count_ratings?group_level=2'),
          this.couchService.get('activity_logs/_design/activity_logs/_view/count_activity_by_type?group_level=3')
        ])
      }))
      .subscribe((logs) => {
        this.logs.data = this.logs.data.map(c => {
          c['resource_activities'] = logs[0].rows.find(l => l.key[0] == c.code && l.key[1] == c.parentCode);
          c['ratings'] = logs[1].rows.find(l => l.key[0] == c.code && l.key[1] == c.parentCode);
          c['activity_logs'] = logs[2].rows.find(l => l.key[1] == c.code && l.key[2] == c.parentCode);
          return c;
        })
      }, (error) => this.message = 'There was a problem getting Activity Logs');
  }

}
