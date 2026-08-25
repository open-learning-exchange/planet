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
import { mergeConfiguration, parentConfiguration, patchOwns, patchesParentConfiguration } from './configuration.utils';

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
   * Applies a partial configuration change and runs the side effects the submitted fields call for.
   * Callers submit only the fields they own, e.g. the currency screen submits
   * `{ currency: { ...this.form.value } }`, and never have to reconstruct the whole doc or restore
   * the secrets `StateService.configuration` hides from them. The patch is merged onto the latest
   * local revision, so concurrent changes to other fields survive.
   *
   * Side effects are keyed off the patch rather than applied to every write: `_users/_security` is
   * only touched when the patch owns `autoAccept`, which needs CouchDB administrator permissions,
   * and the parent planet only hears about a patch which changes a `parentConfigurationFields`
   * field. A patch of purely local fields — `currency`, `keys`, `customVoiceLabels` — therefore
   * writes nothing but the local doc. Emits the updated local configuration exactly once, after
   * every side effect it needed has finished.
   */
  patchConfiguration(patch: any) {
    return this.patchLocalConfiguration(patch).pipe(switchMap((configuration) => {
      const sideEffects = [
        ...(patchOwns(patch, 'autoAccept') ? [ this.updateAutoAccept(configuration.autoAccept) ] : []),
        // The parent sync emits nothing of its own for a planet the parent already knows about
        ...(patchesParentConfiguration(patch) ? [ this.sendConfigurationToParent(configuration).pipe(toArray()) ] : [])
      ];
      return sideEffects.length === 0 ? of(configuration) : forkJoin(sideEffects).pipe(map(() => configuration));
    }));
  }

  /**
   * Merges a patch onto the latest local revision and writes it back, retrying once on a conflict.
   * Writes the doc and nothing else, so callers with no permission to touch `_users/_security` — or
   * no reason to — can use it directly. Any `_rev` the caller supplies is dropped, since it is only
   * as fresh as the copy the caller was holding.
   */
  patchLocalConfiguration(patch: any, retriesOnConflict = 1): Observable<any> {
    const { _rev: callerRev, ...fields } = patch;
    return this.getConfiguration(patch._id).pipe(
      switchMap((configuration) =>
        this.couchService.updateDocument('configurations', mergeConfiguration(configuration, fields)).pipe(
          map(({ doc }) => doc),
          catchError((error) => error.status === 409 && retriesOnConflict > 0 ?
            this.patchLocalConfiguration(patch, retriesOnConflict - 1) : throwError(error))
        ))
    );
  }

  getConfiguration(configurationId = this.stateService.configuration._id) {
    return configurationId ?
      this.couchService.get('configurations/' + configurationId) :
      throwError(new Error('There is no local configuration to update'));
  }

  private sendConfigurationToParent(configuration: any) {
    return this.couchService.post(
      'communityregistrationrequests/_find',
      findDocuments({ 'code': configuration.code }),
      { domain: configuration.parentDomain }
    ).pipe(switchMap((res) => {
      // The parent keeps its own revision of the doc, so take its _id and _rev when it already has one
      const parentConfig = res.docs.length ? { _id: res.docs[0]._id, _rev: res.docs[0]._rev } : {};
      const userDetail = { ...this.userService.get(), ...this.userService.credentials };
      return this.addPlanetToParent({ ...parentConfiguration(configuration), ...parentConfig }, res.docs.length === 0, userDetail);
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
