import { Component, OnInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { SyncService } from '../shared/sync.service';

@Component({
  templateUrl: './manager-sync.component.html'
})

export class ManagerSyncComponent implements OnInit {

  replicators = [];

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.getReplicators();
  }

  getReplicators() {
    this.couchService.allDocs('_replicator').subscribe(data => {
        this.replicators = data;
    });
  }

  syncPlanet() {
    const credentials = [];
    const deleteArray = this.replicators.map(rep => {
      return { _id: rep._id, _rev: rep._rev, _deleted: true };
    });
    this.syncService.deleteReplicator(deleteArray).pipe(switchMap(data => {
      return forkJoin(this.replicatorTask(credentials));
    })).subscribe(data => {
      this.planetMessageService.showMessage('Syncing started');
    }, error => this.planetMessageService.showMessage('There was error on syncing'));
  }

  replicatorTask(credentials) {
    // List of replicators to push to parent planet
    const pushList = [
      { db: 'courses_progress', options: { _id: 'courses_progress_to_parent' } },
      { db: 'feedback', options: { _id: 'feedback_to_parent' } },
      { db: 'login_activities', options: { _id: 'login_activities_to_parent' } },
      { db: 'ratings', options: { _id: 'ratings_to_parent' } },
      { db: 'resource_activities', options: { _id: 'resource_activities_to_parent' } }
    ];
    // List of replicators to pull from parent
    const pullList = [
      { db: 'feedback', options: { _id: 'feedback_from_parent', selector: { source: this.userService.getConfig().code } } },
      { db: 'notifications', options: { _id: 'notifications_from_parent', selector: { target: this.userService.getConfig().code } } }
    ];
    const obs = pushList.map(push => {
      return this.syncService.syncUp(push, credentials);
    });
    pullList.map(pull => {
      obs.push(this.syncService.syncDown(pull, credentials));
    });
    return obs;
  }

}
