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
  pushList = [
    { db: 'courses_progress' },
    { db: 'feedback' },
    { db: 'login_activities' },
    { db: 'ratings' },
    { db: 'resource_activities' }
  ];

  pullList = [
    { db: 'feedback', selector: { source: this.userService.getConfig().code } },
    { db: 'notifications', selector: { target: this.userService.getConfig().code } }
  ];

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

  getDefaultList() {
    const addType = (type) => (val) => val.db + '_' + type;
    return this.pushList.map(addType('push')).concat(this.pullList.map(addType('pull')));
  }

  syncPlanet() {
    const deleteArray = this.replicators.filter(rep => {
      const defaultList = this.replicatorList((type) => (val) => val.db + '_' + type);
      return rep._replication_state === 'completed' || defaultList.indexOf(rep._id) > -1;
    }).map(rep => {
      return { ...rep, _deleted: true };
    });
    this.syncService.deleteReplicators(deleteArray).pipe(switchMap(data => {
      return this.syncService.confirmPasswordAndRunReplicators(this.replicatorList());
    })).subscribe(data => {
      this.planetMessageService.showMessage('Syncing started');
      this.getReplicators();
    }, error => this.planetMessageService.showMessage(error));
  }

  replicatorList(mapFunc = (type) => (val) => ({ ...val, type })) {
    return this.pushList.map(mapFunc('push')).concat(this.pullList.map(mapFunc('pull')));
  }

}
