import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'app-apk-logs',
  templateUrl: './apk-logs.component.html'
})
export class ApkLogsComponent {

  apk_logs = [];

  constructor(
    private couchService: CouchService,
  ) {
    this.couchService.findAll('apk_logs').subscribe(apk_logs => this.apk_logs = apk_logs);
  }

}
