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
    const deleteArray = this.replicators.map(rep => {
      return { _id: rep._id, _rev: rep._rev, _deleted: true };
    });
    this.syncService.deleteReplicators(deleteArray).pipe(switchMap(data => {
      return this.syncService.confirmPasswordAndRunReplicators(this.replicatorList());
    })).subscribe(data => {
      this.planetMessageService.showMessage('Syncing started');
      this.getReplicators();
    }, error => this.planetMessageService.showMessage('There was error on syncing'));
  }

  replicatorList() {
    // List of replicators to push to parent planet
    const pushList = [
      { db: 'courses_progress' },
      { db: 'feedback' },
      { db: 'login_activities' },
      { db: 'ratings' },
      { db: 'resource_activities' }
    ];
    // List of replicators to pull from parent
    const pullList = [
      { db: 'feedback', selector: { source: this.userService.getConfig().code } },
      { db: 'notifications', selector: { target: this.userService.getConfig().code } }
    ];
    const addType = (type) => (val) => ({ ...val, type });
    return pushList.map(addType('push')).concat(pullList.map(addType('pull')));
  }

}
