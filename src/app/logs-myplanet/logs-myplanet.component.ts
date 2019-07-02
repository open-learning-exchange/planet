import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';

@Component({
  templateUrl: './logs-myplanet.component.html'
})
export class LogsMyPlanetComponent {

  apklogs = [];

  constructor(
    private couchService: CouchService,
  ) {
    this.couchService.findAll('apk_logs').subscribe(apklogs => this.apklogs = apklogs);
  }

}
