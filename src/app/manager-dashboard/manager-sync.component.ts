import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { forkJoin } from 'rxjs';

@Component({
  templateUrl: './manager-sync.component.html',
  styles: [ `
    .mat-mdc-button > .mat-icon.svg-icon {
      height: inherit;
    }
  ` ]
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
    forkJoin([
      this.couchService.get('_scheduler/docs'),
      this.couchService.findAll('_replicator')
    ])
    .subscribe(([ reps, data ]) => {
      const jobs = reps.docs.filter(replicator => replicator.database === '_replicator');
      this.replicators = data.map((rep: any) => ({ ...rep, ...jobs.find(n => n.doc_id === rep._id) }));
      this.dialogsLoadingService.stop();
    });
  }

}
