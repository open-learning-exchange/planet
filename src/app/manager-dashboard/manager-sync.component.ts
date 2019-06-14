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
  planetConfiguration = this.stateService.configuration;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private syncService: SyncService,
    private planetMessageService: PlanetMessageService,
    private managerService: ManagerService,
    private stateService: StateService,
    private reportsService: ReportsService,
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

  runSyncClick() {
    this.dialogsLoadingService.start();
    this.updateReplicatorUsers().subscribe(() => {
      this.syncPlanet();
    });
  }

  syncPlanet() {
    const deleteArray = this.replicators.filter(rep => {
      const defaultList = this.replicatorList((type) => (val) => val.db + '_' + type);
      return rep._replication_state === 'completed' || defaultList.indexOf(rep._id) > -1;
    }).map(rep => {
      return { ...rep, _deleted: true };
    });
    this.syncService.deleteReplicators(deleteArray).pipe(
      switchMap(() => forkJoin(this.sendStatsToParent(), this.getParentUsers())),
      map(([ res, users ]) => this.updateParentUsers(users)),
      switchMap(() => {
        return this.couchService.findAll('achievements', findDocuments({ sendToNation: true, createdOn: this.planetConfiguration.code }));
      }),
      switchMap(achievements => this.achievementResourceReplicator(achievements)),
      switchMap(replicators => {
        this.dialogsLoadingService.stop();
        return this.syncService.confirmPasswordAndRunReplicators(this.replicatorList().concat(replicators));
      }),
      switchMap(res => this.managerService.addAdminLog('sync'))
    ).subscribe(data => {
      this.planetMessageService.showMessage('Syncing started');
      this.getReplicators();
    }, error => this.planetMessageService.showMessage(error));
  }

  replicatorList(mapFunc = (type) => (val) => ({ ...val, type })) {
    const bothList = [
      { db: 'submissions', selector: { source: this.planetConfiguration.code } },
      { db: 'teams', selector: { teamType: 'sync', teamPlanetCode: this.planetConfiguration.code } },
      { db: 'news', selector: { messageType: 'sync', messagePlanetCode: this.planetConfiguration.code } }
    ];
    const pushList = [ ...this.pushList(), ...bothList ];
    const pullList = [ ...this.pullList(), ...bothList ];
    const internalList = [
      { dbSource: '_users', db: 'tablet_users', selector: { 'isUserAdmin': false, 'requestId': { '$exists': false } }, continuous: true }
    ];
    return pushList.map(mapFunc('push')).concat(pullList.map(mapFunc('pull'))).concat(internalList.map(mapFunc('internal')));
  }

  pushList() {
    return [
      { db: 'courses_progress' },
      { db: 'feedback' },
      { db: 'login_activities' },
      { db: 'ratings' },
      { db: 'resource_activities' },
      { dbSource: 'replicator_users', dbTarget: 'child_users' },
      { db: 'admin_activities' },
      { db: 'achievements', selector: { sendToNation: true, createdOn: this.planetConfiguration.code } },
      { db: 'apk_logs' },
      { db: 'myplanet_activities' },
      { db: 'team_activities', selector: { teamType: 'sync', teamPlanetCode: this.planetConfiguration.code } }
    ];
  }

  pullList() {
    return [
      { db: 'feedback', selector: { source: this.planetConfiguration.code } },
      { db: 'notifications', selector: { target: this.planetConfiguration.code } }
    ];
  }

  updateReplicatorUsers() {
    return forkJoin([
      this.couchService.findAll('_users', findDocuments(
        { 'isUserAdmin': { '$exists': true }, 'requestId': { '$exists': false } },
        this.userService.userProperties.filter(prop => prop !== 'requestId')
      )),
      this.couchService.findAll('replicator_users', { 'selector': {} })
    ]).pipe(
      switchMap(([ users, repUsers ]) => {
        const newRepUsers = this.createReplicatorUserDoc(users, repUsers);
        const deletedRepUsers = repUsers
          .filter((rUser: any) => users.findIndex((user: any) => rUser.couchId === user._id) < 0)
          .map((rUser: any) => ({ ...rUser, '_deleted': true }));
        return this.couchService.post('replicator_users/_bulk_docs', { docs: newRepUsers.concat(deletedRepUsers) });
      })
    );
  }

  createReplicatorUserDoc(users: any[], repUsers: any[]) {
    const planetCode = this.planetConfiguration.code;
    return users.map((user: any) => {
      const repUser = repUsers.find((rUser: any) => rUser.couchId === user._id) || {},
        { _id, _rev, ...userProps } = user;
      return {
        ...repUser,
        ...userProps,
        _id: user.name + '@' + planetCode,
        couchId: user._id,
        planetCode: planetCode
      };
    });
  }

  sendStatsToParent() {
    const { code, parentDomain: domain } = this.planetConfiguration;
    return forkJoin([
      this.reportsService.getDatabaseCount('resources'),
      this.reportsService.getDatabaseCount('courses'),
      this.getChildStats(code, domain)
    ]).pipe(switchMap(([ totalResources, totalCourses, stats ]) => {
      const { error, reason, docs, rows, ...statsDoc } = stats;
      return this.couchService.post('child_statistics', { _id: code, ...statsDoc, totalCourses, totalResources }, { domain });
    }));
  }

  getChildStats(code, domain) {
    return this.couchService.get('child_statistics/' + code, { domain }).pipe(catchError((err) => {
      if (err.error.reason === 'missing') {
        return of({});
      }
      return throwError(err);
    }));
  }

  achievementResourceReplicator(achievements: any[]) {
    return this.syncService.replicatorsArrayWithTags(
      achievements.filter(a => a.sendToNation === true).map(a => ({ db: 'achievements', item: a })), 'push', 'local'
    ).pipe(map(replicators => replicators.filter(rep => rep.db !== 'achievements')));
  }

  getParentUsers() {
    return this.couchService.findAll(
      '_users',
      findDocuments({ planetCode: this.planetConfiguration.parentCode }),
      { domain: this.planetConfiguration.parentDomain }
    );
  }

  updateParentUsers(newUsers: any[]) {
    this.couchService.findAll('parent_users').pipe(switchMap((oldUsers: any[]) => {
      const deleteArray = oldUsers
        .filter(oldUser => !newUsers.some(newUser => newUser._id === oldUser._id))
        .map(oldUser => ({ ...oldUser, _deleted: true }));
      const updateArray = newUsers.map(newUser => {
        const oldUser = oldUsers.find(old => newUser._id === old._id);
        return { ...newUser, _rev: oldUser ? oldUser._rev : undefined };
      });
      const docs = [ ...deleteArray, ...updateArray ].map(({ _attachments, ...doc }) => doc);
      return this.couchService.bulkDocs('parent_users', docs);
    })).subscribe((res) => console.log(res));
  }

}
