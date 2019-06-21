import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'planet-apk-logs',
  templateUrl: './apk-logs.component.html'
})
export class ApkLogsComponent {

  apklogs = [];

  constructor(
    private couchService: CouchService,
  ) {
    this.couchService.findAll('apk_logs').subscribe(apklogs => this.apklogs = apklogs);
  }

}
