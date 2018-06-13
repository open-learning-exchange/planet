import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { switchMap } from 'rxjs/operators';
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
    this.getJobs();
  }

  getJobs() {
    // _scheduler/jobs
    // _scheduler/docs
    this.couchService.get('_scheduler/docs').subscribe(data => {
        this.replicators = data.docs.filter(j => {
            return j.database === '_replicator';
        });
    });
  }

  deleteReplicator(rep) {
    this.couchService.get('_replicator/' + rep).pipe(
      switchMap(repeator => {
        return this.couchService.post('_replicator', { _id: repeator._id, _rev: repeator._rev, _deleted: true });
      })
    ).subscribe(data => {
      this.planetMessageService.showMessage('Task removed successfully');
      this.getJobs();
    }, error => this.planetMessageService.showMessage('Task could not be removed'));
  }

}
