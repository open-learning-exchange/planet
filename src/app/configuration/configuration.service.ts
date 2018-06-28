import { Injectable } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { switchMap, mergeMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { findDocuments } from '../shared/mangoQueries';
import { SyncService } from '../shared/sync.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private userService: UserService,
    private syncService: SyncService
  ) {}

  onSubmitConfiguration(configurationType, oldConfiguration, configurationFormGroup, contactFormGroup, loginForm) {
    if (configurationType === 'update') {
      this.updateConfiguration(oldConfiguration, configurationFormGroup, contactFormGroup);
    } else if (loginForm.valid && configurationFormGroup.valid && contactFormGroup.valid) {
      const {
        confirmPassword,
        ...credentials
      } = loginForm.value;
      const adminName = credentials.name + '@' + configurationFormGroup.controls.code.value;
      const configuration = Object.assign({
          registrationRequest: 'pending',
          adminName
        },
        configurationFormGroup.value, contactFormGroup.value);
      const userDetail: any = {
        ...credentials,
        'roles': [],
        'type': 'user',
        'isUserAdmin': true,
        'joinDate': Date.now(),
        'parentCode': configuration.code,
        ...contactFormGroup.value
      };
      this.createPlanet(credentials, configuration, adminName, userDetail);
    }
  }

  createRequestNotification(configuration) {
    return mergeMap(data => {
      const requestNotification = {
        'user': 'SYSTEM',
        'message': 'New ' + configuration.planetType + ' "' + configuration.name + '" has requested to connect.',
        'link': '/requests/',
        'linkParams': { 'search': configuration.code },
        'type': 'request',
        'priority': 1,
        'status': 'unread',
        'time': Date.now()
      };
      // Send notification to parent
      return this.couchService.post('notifications', requestNotification, {
        domain: configuration.parentDomain
      });
    });
  }

  addUserToParentPlanet(userDetail, adminName, configuration) {
    return mergeMap((data: any) => {
      // then add user to parent planet with id of configuration and isUserAdmin set to false
      userDetail['requestId'] = data.id;
      userDetail['isUserAdmin'] = false;
      return this.createUser(adminName, { ...userDetail,
        name: adminName
      }, {
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

  createPlanet(credentials, configuration, adminName, userDetail) {
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
    const pin = this.userService.createPin();
    forkJoin([
      this.createUser('satellite', { 'name': 'satellite', 'password': pin, roles: [ 'learner' ], 'type': 'user' }),
      this.couchService.put('_node/nonode@nohost/_config/satellite/pin', pin)
    ]).pipe(
      switchMap(res => {
        return forkJoin([
          // create replicator for pulling from parent at first as we do not have session
          this.syncService.sync({ ...replicatorObj, db: 'courses' }, credentials),
          this.syncService.sync({ ...replicatorObj, db: 'resources' }, credentials),
          this.syncService.sync(userReplicator, credentials)
        ]);
      }),
      switchMap(() => this.couchService.post('configurations', configuration)),
      switchMap((conf) => {
        return forkJoin([
          // When creating a planet, add admin
          this.couchService.put('_node/nonode@nohost/_config/admins/' + credentials.name, credentials.password),
          // then add user with same credentials
          this.createUser(credentials.name, userDetail),
          // then add a shelf for that user
          this.couchService.put('shelf/org.couchdb.user:' + credentials.name, {}),
          // then post configuration to parent planet's registration requests
          this.couchService.post('communityregistrationrequests', { ...configuration, _id: conf.id }, {
            domain: configuration.parentDomain
          }).pipe(
            this.addUserToParentPlanet(userDetail, adminName, configuration),
            this.addUserToShelf(adminName, configuration),
            this.createRequestNotification(configuration)
          )
        ]);
      })
    )
    .subscribe((data) => {
      this.planetMessageService.showMessage('Admin created: ' + credentials.name);
      this.router.navigate([ '/login' ]);
    }, (error) => this.planetMessageService.showAlert('There was an error creating planet'));
  }

  updateConfiguration(oldConfiguration, configurationFormGroup, contactFormGroup) {
      if (configurationFormGroup.valid && contactFormGroup.valid) {
      const configuration = Object.assign(
        oldConfiguration,
        configurationFormGroup.value,
        contactFormGroup.value
      );
      this.couchService.put(
        'configurations/' + oldConfiguration._id,
        configuration
      ).pipe(switchMap(() => {
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
        return res.docs.length ? this.update(configuration, { ...localConfig, ...parentConfig })
          : this.reSubmit(configuration, { ...localConfig, ...parentConfig });
      })).subscribe(() => {
        // Navigate back to the manager dashboard
        this.router.navigate([ '/manager' ]);
        this.planetMessageService.showMessage('Configuration Updated Successfully');
      }, err => {
        // Connect to an error display component to show user that an error has occured
        console.log(err);
      });
    }
  }

  update(configuration, newConfig) {
    return this.couchService.post(
      'communityregistrationrequests',
      newConfig,
      { domain: configuration.parentDomain }
    );
  }

  reSubmit(configuration, newConfig) {
    const { _rev: userRev, _id: userId, ...userDetail } = this.userService.get();
    const adminName = configuration.adminName;
    return this.syncService.openConfirmation().pipe(
      switchMap((credentials) => {
        return this.update(configuration, newConfig).pipe(
          this.addUserToParentPlanet({ ...userDetail, roles: [], ...credentials }, adminName, configuration),
          this.addUserToShelf(adminName, configuration),
          this.createRequestNotification(configuration)
        );
      })
    );
  }

  createUser(name, details, opts?) {
    return this.couchService.put('_users/org.couchdb.user:' + name, details, opts);
  }

}
