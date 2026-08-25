import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { catchError, map, switchMap, mergeMap, takeWhile, toArray } from 'rxjs/operators';
import { forkJoin, Observable, of, throwError } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { StateService } from '../shared/state.service';
import { SyncService } from '../shared/sync.service';
import { dedupeShelfReduce, stringToHex } from '../shared/utils';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private managerService: ManagerService,
    private stateService: StateService,
    private syncService: SyncService
  ) {}

  createRequestNotification(configuration) {
    return mergeMap(data => {
      const requestNotification = {
        'user': 'SYSTEM',
        'message': $localize`New ${configuration.planetType} <b>"${configuration.name}"</b> has requested to connect.`,
        'link': '/manager/requests/',
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
      return this.createUser(adminName, userDetail, { domain: configuration.parentDomain, withCredentials: false });
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
      dbSource: '_users', db: 'tablet_users',
      selector: { 'isUserAdmin': false, 'requestId': { '$exists': false } },
      continuous: true, type: 'internal'
    };
    const meetupReplicator = {
      dbSource: 'meetups', db: 'community_meetups',
      selector: { 'link': { 'teams': { '$eq': `${configuration.code}@${configuration.parentCode}` } } },
      continuous: true, type: 'internal'
    };
    return forkJoin([
      // create replicator for pulling from parent at first as we do not have session
      this.syncService.sync({ ...replicatorObj, db: 'courses' }, credentials),
      this.syncService.sync({ ...replicatorObj, db: 'resources' }, credentials),
      this.syncService.sync({ ...replicatorObj, db: 'exams' }, credentials),
      this.syncService.sync({ ...replicatorObj, db: 'tags' }, credentials),
      this.syncService.sync(userReplicator, credentials),
      this.syncService.sync(meetupReplicator, credentials)
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
      switchMap(([ conf ]) => forkJoin([ of(conf), this.setCouchPerUser(conf) ])),
      switchMap(([ conf ]) => forkJoin([
        // When creating a planet, add admin
        this.couchService.put('_node/nonode@nohost/_config/admins/' + credentials.name, credentials.password),
        // then add user with same credentials
        this.createUser(credentials.name, userDetail),
        // then add a shelf for that user
        this.couchService.put('shelf/org.couchdb.user:' + credentials.name, {}),
        // and add credentials.yml for that user
        this.managerService.updateCredentialsYml(credentials),
        // then post configuration to parent planet's registration requests
        this.addPlanetToParent({ ...configuration, _id: conf.id }, true, userDetail)
      ]))
    );
  }

  /**
   * Applies a configuration patch locally and forwards it to the parent without keys.
   * Use patchLocalConfiguration for settings which must remain on this planet.
   */
  patchConfiguration(patch: any) {
    return this.patchLocalConfiguration(patch).pipe(switchMap((configuration) => {
      const sideEffects = [
        // addPlanetToParent emits nothing for an existing registration, so collect its completion
        this.sendConfigurationPatchToParent(configuration, patch).pipe(toArray()),
        ...(Object.prototype.hasOwnProperty.call(patch, 'autoAccept') ? [ this.updateAutoAccept(configuration.autoAccept) ] : [])
      ];
      return forkJoin(sideEffects).pipe(map(() => configuration));
    }));
  }

  patchLocalConfiguration(patch: any): Observable<any> {
    return this.patchLocalConfigurationWithRetry(patch, 1);
  }

  private patchLocalConfigurationWithRetry(patch: any, retriesOnConflict: number): Observable<any> {
    const fields = { ...patch };
    delete fields._rev;
    return this.getConfiguration(fields._id).pipe(
      switchMap((configuration) =>
        this.couchService.updateDocument('configurations', { ...configuration, ...fields }).pipe(
          map(({ doc }) => doc),
          catchError((error) => error?.status === 409 && retriesOnConflict > 0 ?
            this.patchLocalConfigurationWithRetry(patch, retriesOnConflict - 1) : throwError(error))
        ))
    );
  }

  private getConfiguration(configurationId?: string) {
    configurationId = configurationId ?? this.stateService.configuration?._id;
    return configurationId ?
      this.couchService.get('configurations/' + configurationId) :
      throwError(new Error('There is no local configuration to update'));
  }

  private sendConfigurationPatchToParent(configuration: any, patch: any) {
    return this.couchService.post(
      'communityregistrationrequests/_find',
      findDocuments({ 'code': configuration.code }),
      { domain: configuration.parentDomain }
    ).pipe(switchMap((res) => {
      const parentPatch = { ...patch };
      delete parentPatch._id;
      delete parentPatch._rev;
      delete parentPatch.keys;
      const parentConfiguration = res.docs.length ? { ...res.docs[0], ...parentPatch } : { ...configuration };
      if (res.docs.length === 0) {
        // A new parent registration cannot use the local CouchDB revision
        delete parentConfiguration._rev;
        delete parentConfiguration.keys;
      }
      const userDetail = { ...this.userService.get(), ...this.userService.credentials };
      return this.addPlanetToParent(parentConfiguration, res.docs.length === 0, userDetail);
    }));
  }

  createUser(name, details, opts?) {
    return this.couchService.updateDocument('_users', { '_id': 'org.couchdb.user:' + name, ...details }, opts);
  }

  setCouchPerUser({ doc: configuration }) {
    return forkJoin([
      this.couchService.put('_node/nonode@nohost/_config/couch_peruser/database_prefix', `userdb-${stringToHex(configuration.code)}-`),
      this.couchService.put('_node/nonode@nohost/_config/couch_peruser/delete_dbs', 'true'),
      this.couchService.put('_node/nonode@nohost/_config/couch_peruser/enable', 'true')
    ]);
  }

}
