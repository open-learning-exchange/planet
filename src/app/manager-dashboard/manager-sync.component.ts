import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './manager-sync.component.html'
})

export class ManagerSyncComponent implements OnInit {

  replicators = [];

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    // /_scheduler/jobs
    // /_scheduler/docs
    this.couchService.get('_scheduler/jobs').subscribe(data => {
  });
    this.couchService.get('_scheduler/docs').subscribe(data => {
        this.replicators = data.docs.filter(j => {
            return j.database === '_replicator';
        });
    });
  }

}
