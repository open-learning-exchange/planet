import { Directive, HostListener, Output, EventEmitter } from '@angular/core';
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

@Directive({
  selector: '[planetSync]'
})
export class SyncDirective {
  @Output() syncComplete = new EventEmitter<void>();

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

  @HostListener('click')
  runSyncClick() {
    this.dialogsLoadingService.start();
    this.updateReplicatorUsers().subscribe(() => {
      this.syncPlanet();
    });
  }

  syncPlanet() {
    const defaultList = this.replicatorList((type) => (val) => this.syncService.replicatorId(val, type));
    const deleteArray = (replicators) => replicators.filter(rep => {
      return rep._replication_state === 'completed' || defaultList.indexOf(rep._id) > -1;
    }).map(rep => {
      return { ...rep, _deleted: true };
    });
    this.couchService.findAll('_replicator').pipe(
      switchMap((replicators) => this.syncService.deleteReplicators(deleteArray(replicators))),
      switchMap(() => forkJoin(this.sendStatsToParent(), this.getParentUsers())),
      map(([ res, users ]) => this.updateParentUsers(users)),
      switchMap(() => this.getAchievementsAndTeamAndNewsResources()),
      switchMap(([ achievements, teamResources, news ]: any[]) =>
        forkJoin(this.achievementResourceReplicator(achievements), this.teamAndNewsResourcesReplicator(teamResources, news))
      ),
      switchMap((replicators: any) => {
        this.dialogsLoadingService.stop();
        return this.syncService.confirmPasswordAndRunReplicators(this.replicatorList().concat(replicators.flat(2)));
      }),
      switchMap(res => this.managerService.addAdminLog('sync'))
    ).subscribe(data => {
      this.planetMessageService.showMessage($localize`Syncing started`);
      this.syncComplete.emit();
    }, error => this.planetMessageService.showMessage(error.error ? error.error.reason : error));
  }

  replicatorList(mapFunc = (type) => (val) => ({ continuous: this.planetConfiguration.alwaysOnline, ...val, type })) {
    const bothList = [
      { db: 'submissions', selector: { source: this.planetConfiguration.code } },
      { db: 'teams', selector: { '$or': [ { teamType: 'sync' }, { docType: 'link' } ], teamPlanetCode: this.planetConfiguration.code } },
      { db: 'news', selector: { '$or': [
        { messageType: 'sync', messagePlanetCode: this.planetConfiguration.code },
        { viewIn: { '$elemMatch': { '_id': `${this.planetConfiguration.code}@${this.planetConfiguration.parentCode}` } } }
      ] } },
      { db: 'team_activities', selector: { teamType: 'sync', teamPlanetCode: this.planetConfiguration.code } },
      { db: 'tasks', selector: { 'sync.type': 'sync', 'sync.planetCode': this.planetConfiguration.code } },
      { db: 'meetups', selector: { 'sync.type': 'sync', 'sync.planetCode': this.planetConfiguration.code } }
    ];
    const pushList = [ ...this.pushList(), ...bothList ];
    const pullList = [ ...this.pullList(), ...bothList ];
    const internalList = [
      { dbSource: '_users', db: 'tablet_users', selector: { 'isUserAdmin': false, 'requestId': { '$exists': false } }, continuous: true },
      { dbSource: 'meetups', db: 'community_meetups', selector: { 'link': { 'teams': { '$eq': `${this.planetConfiguration.code}@${this.planetConfiguration.parentCode}` } } }, continuous: true }
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
      { db: 'notifications', selector: { userPlanetCode: this.planetConfiguration.parentCode } },
      { db: 'attachments', selector: { planetCode: this.planetConfiguration.code } },
      { db: 'course_activities' },
      { db: 'search_activities' },
      { db: 'health', selector: { planetCode: this.planetConfiguration.code } },
    ];
  }

  pullList() {
    return [
      { db: 'feedback', selector: { source: this.planetConfiguration.code } },
      { db: 'notifications', selector: { userPlanetCode: this.planetConfiguration.code } },
      { db: 'attachments', selector: { planetCode: this.planetConfiguration.parentCode } }
    ];
  }

  updateReplicatorUsers() {
    const userProperties = this.userService.userProperties.filter(prop => prop !== 'requestId');
    return forkJoin([
      this.couchService.findAll('_users', findDocuments(
        { 'isUserAdmin': { '$exists': true }, 'requestId': { '$exists': false } },
        userProperties
      )),
      this.couchService.findAll('replicator_users', findDocuments({}, [ ...userProperties, 'couchId', 'planetCode' ]))
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
    })).subscribe();
  }

  getAchievementsAndTeamAndNewsResources() {
    return forkJoin([
      this.couchService.findAll('achievements', findDocuments({ sendToNation: true, createdOn: this.planetConfiguration.code })),
      this.couchService.findAll(
        'teams', findDocuments({ docType: 'resourceLink', teamType: 'sync', teamPlanetCode: this.planetConfiguration.code })
      ),
      this.couchService.findAll('news', findDocuments({ images: { '$exists': true }, messageType: 'sync' }))
    ]);
  }

  teamAndNewsResourcesReplicator(teamResources: any[], news: any[]) {
    const replicator = linkDoc => ({ db: 'resources', item: { _id: linkDoc.resourceId } });
    return forkJoin([
      this.syncService.replicatorsArrayWithTags(
        [
          ...teamResources.map(replicator),
          ...news.map(post => post.images.map(replicator)).flat()
        ],
        'push',
        'local'
      ),
      this.syncService.replicatorsArrayWithTags(
        news.filter(post => post.createdOn !== this.planetConfiguration.code).map(post => post.images.map(replicator)).flat(),
        'pull',
        'parent'
      )
    ]);
  }

}
