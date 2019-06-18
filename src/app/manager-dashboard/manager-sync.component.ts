import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin, throwError, of } from 'rxjs';
import { switchMap, catchError, map } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { SyncService } from '../shared/sync.service';
import { findDocuments } from '../shared/mangoQueries';
import { ManagerService } from './manager.service';
import { StateService } from '../shared/state.service';
import { ReportsService } from './reports/reports.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';

@Component({
  templateUrl: './manager-sync.component.html'
})

export class ManagerSyncComponent implements OnInit {

  replicators = [];

  constructor(
    private couchService: CouchService,
    private dialogsLoadingService: DialogsLoadingService
  ) {}

  ngOnInit() {
    this.getReplicators();
  }

  getReplicators() {
    this.dialogsLoadingService.start();
    this.couchService.findAll('_replicator').subscribe(data => {
      this.replicators = data;
      this.dialogsLoadingService.stop();
    });
  }

}
