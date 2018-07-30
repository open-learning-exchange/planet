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
  replicatorsDoc = [];
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
    this.couchService.get('_scheduler/docs').pipe(switchMap(data => {
      this.replicators = data.docs;
      return this.couchService.allDocs('_replicator');
    })).subscribe(rep => {
      const defaultList = this.getDefaultList();
      this.replicatorsDoc = rep.filter(r => {
        const replicator = r.find((doc: any) => doc._id === r.id);
        return replicator._replication_state === 'completed' && defaultList.indexOf(replicator._id) > -1;
      });
    });
  }

  getDefaultList() {
    const addType = (type) => (val) => ( val.db + '_' + type );
    return this.pushList.map(addType('push')).concat(this.pullList.map(addType('pull')));
  }

  syncPlanet() {
    const deleteArray = this.replicatorsDoc.map(rep => {
      return { _id: rep.id, _rev: rep._rev, _deleted: true };
    });
    this.syncService.deleteReplicators(deleteArray).pipe(switchMap(data => {
      return this.syncService.confirmPasswordAndRunReplicators(this.replicatorList());
    })).subscribe(data => {
      this.planetMessageService.showMessage('Syncing started');
      this.getReplicators();
    }, error => this.planetMessageService.showMessage(error));
  }

  replicatorList() {
    const addType = (type) => (val) => ({ ...val, type });
    return this.pushList.map(addType('push')).concat(this.pullList.map(addType('pull')));
  }

}
