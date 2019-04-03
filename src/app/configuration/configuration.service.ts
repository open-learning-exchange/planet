import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { switchMap, mergeMap, takeWhile, tap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { SyncService } from '../shared/sync.service';
import { dedupeShelfReduce } from '../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  configuration: any;
  lastSeq: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private managerService: ManagerService,
    private syncService: SyncService
  ) {}

  createRequestNotification(configuration) {
    return mergeMap(data => {
      const requestNotification = {
        'user': 'SYSTEM',
        'message': `New ${configuration.planetType} <b>"${configuration.name}"</b> has requested to connect.`,
        'link': '/requests/',
        'linkParams': { 'search': configuration.code },
        'type': 'request',
        'priority': 1,
        'status': 'unread',
        'time': this.couchService.datePlaceholder
      };
      // Send notification to parent
      return this.couchService.updateDocument('notifications', requestNotification, {
        domain: configuration.parentDomain
      });
    });
  }

  addUserToParentPlanet(userDetail: any, adminName, configuration) {
    const { _id, _rev, ...user } = userDetail;
    return mergeMap((data: any) => {
      // then add user to parent planet with id of configuration and isUserAdmin set to false
      userDetail = { ...user, requestId: data.id, isUserAdmin: false, roles: [], name: adminName };
      return this.createUser(adminName, userDetail, {
        domain: configuration.parentDomain
      });
    });
  }

  addUserToShelf(adminName, configuration) {
    return mergeMap(data => {
      return this.couchService.put('shelf/org.couchdb.user:' + adminName, {}, {
        domain: configuration.parentDomain
      });
    });
  }

  createReplicators(configuration, credentials) {
    const replicatorObj = {
      type: 'pull',
      parentDomain: configuration.parentDomain,
      code: configuration.code,
      selector: { 'sendOnAccept': true }
    };
    const userReplicator = {
      dbSource: '_users',
      db: 'tablet_users',
      selector: { 'isUserAdmin': false, 'requestId': { '$exists': false } },
      continuous: true,
      type: 'internal'
    };
    return forkJoin([
      // create replicator for pulling from parent at first as we do not have session
      this.syncService.sync({ ...replicatorObj, db: 'courses' }, credentials),
      this.syncService.sync({ ...replicatorObj, db: 'resources' }, credentials),
      this.syncService.sync({ ...replicatorObj, db: 'exams' }, credentials),
      this.syncService.sync({ ...replicatorObj, db: 'tags' }, credentials),
      this.syncService.sync(userReplicator, credentials)
    ]);
  }

  addPlanetToParent(configuration, isNewConfig, userDetail?) {
    if (isNewConfig) {
      configuration.registrationRequest = 'pending';
    }
    return this.couchService.updateDocument('communityregistrationrequests', configuration, {
      domain: configuration.parentDomain
    }).pipe(
      takeWhile(() => isNewConfig),
      this.addUserToParentPlanet(userDetail, configuration.adminName, configuration),
      this.addUserToShelf(configuration.adminName, configuration),
      this.createRequestNotification(configuration)
    );
  }

  postConfiguration(configuration) {
    return forkJoin([
      this.couchService.updateDocument('configurations', configuration),
      this.updateAutoAccept(configuration.autoAccept)
    ]);
  }

  updateAutoAccept(autoAccept) {
    return this.couchService.get('_users/_security').pipe(switchMap((security) => {
      security.admins = security.admins === undefined ? { roles: [] } : security.admins;
      security.admins.roles = autoAccept ?
        security.admins.roles.concat([ 'openlearner' ]).reduce(dedupeShelfReduce, []) :
        security.admins.roles.filter(role => role !== 'openlearner');
      return this.couchService.put('_users/_security', security);
    }));
  }

  createPlanet(admin, configuration, credentials) {
    const userDetail: any = {
      ...admin,
      'roles': [],
      'type': 'user',
      'isUserAdmin': true,
      'joinDate': this.couchService.datePlaceholder,
      'planetCode': configuration.code
    };
    const pin = this.managerService.createPin();
    return forkJoin([
      this.createUser('satellite', { 'name': 'satellite', 'password': pin, roles: [ 'learner' ], 'type': 'user' }),
      this.couchService.put('_node/nonode@nohost/_config/satellite/pin', pin)
    ]).pipe(
      switchMap(() => this.createReplicators(configuration, credentials)),
      switchMap(() => this.postConfiguration(configuration)),
      switchMap(([ conf, autoAcceptRes ]) => {
        return forkJoin([
          // When creating a planet, add admin
          this.couchService.put('_node/nonode@nohost/_config/admins/' + credentials.name, credentials.password),
          // then add user with same credentials
          this.createUser(credentials.name, userDetail),
          // then add a shelf for that user
          this.couchService.put('shelf/org.couchdb.user:' + credentials.name, {}),
          // then post configuration to parent planet's registration requests
          this.addPlanetToParent({ ...configuration, _id: conf.id }, true, userDetail)
        ]);
      })
    );
  }

  updateConfiguration(configuration) {
    return this.postConfiguration(configuration).pipe(switchMap(() => {
      return this.couchService.post(
        'communityregistrationrequests/_find',
        findDocuments({ 'code': configuration.code }),
        { domain: configuration.parentDomain }
      );
    }), switchMap((res) => {
      // Remove local revision as it will have conflict with parent
      const { _rev: localRev, ...localConfig } = configuration;
      // if parent record not found set empty
      const parentConfig = res.docs.length ? { _id: res.docs[0]._id, _rev: res.docs[0]._rev } : {};
      const userDetail = { ...this.userService.get(), ...this.userService.credentials };
      return this.addPlanetToParent({ ...localConfig, ...parentConfig }, res.docs.length === 0, userDetail);
    }));
  }

  createUser(name, details, opts?) {
    return this.couchService.updateDocument('_users', { '_id': 'org.couchdb.user:' + name, ...details }, opts);
  }

}
