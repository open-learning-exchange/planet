import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
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
