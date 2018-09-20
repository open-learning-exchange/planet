import { Component, OnInit } from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  templateUrl: './activity-logs-report.component.html',
})
export class ActivityLogsReportComponent implements OnInit {

  message = '';
  constructor(
    private couchService: CouchService
  ) { }

  ngOnInit() {
  }

}
