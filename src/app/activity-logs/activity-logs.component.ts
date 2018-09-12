import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './activity-logs.component.html',
})
export class ActivityLogsComponent implements OnInit {

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
  }

}
