import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
import { MatStepper } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import { switchMap, mergeMap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { UserService } from '../shared/user.service';
import { SyncService } from '../shared/sync.service';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and '/'
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)\//.exec(str)[1];
};

@Component({
  selector: 'planet-configuration',
  templateUrl: './configuration.component.html',
  styles: [ `
    .mat-raised-button {
      margin: 0px 2px 2px 0px;
    }
    .configuration-form {
      grid-template-areas: "none none ." "none none none";
      justify-items: center;
    }
    .advanced {
      grid-column-start: 2;
    }
  ` ]
})
export class ConfigurationComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  configurationType = 'new';
  nationOrCommunity = 'community';
  message = '';
  loginForm: FormGroup;
  configurationFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  nations = [];
  showAdvancedOptions = false;
  isAdvancedOptionsChanged = false;
  isAdvancedOptionConfirmed = false;
  configuration: any = {};
  defaultLocal = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;

  constructor(
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private syncService: SyncService
  ) { }

  ngOnInit() {
    if (this.route.snapshot.data.update) {
      this.initUpdate();
    }
    this.loginForm = this.formBuilder.group({
      name: [ '', [
        Validators.required,
        CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
        Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i) ]
      ],
      password: [
        '',
        Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('confirmPassword', false)
        ])
      ],
      confirmPassword: [
        '',
        Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('password', true)
        ])
      ]
    });
    this.configurationFormGroup = this.formBuilder.group({
      planetType: [ '', Validators.required ],
      localDomain: this.defaultLocal,
      name: [
        '',
        [ Validators.required,
        Validators.pattern(/^[A-Za-z0-9]/i) ],
        this.parentUniqueValidator('name')
      ],
      parentDomain: [ '', Validators.required ],
      preferredLang: [ '', Validators.required ],
      code: [
        '',
        Validators.required,
        this.parentUniqueValidator('code')
      ],
      createdDate: Date.now()
    });
    this.contactFormGroup = this.formBuilder.group({
      firstName: [ '', Validators.required ],
      lastName: [ '', Validators.required ],
      middleName: [ '' ],
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      phoneNumber: [ '', Validators.required ]
    });
    this.getNationList();
  }

  initUpdate() {
    this.configurationType = 'update';
    const configurationId = this.userService.getConfig()._id;
    this.couchService.get('configurations/' + configurationId)
    .subscribe((data: any) => {
      this.configuration = data;
      this.nationOrCommunity = data.planetType;
      this.configurationFormGroup.patchValue(data);
      this.contactFormGroup.patchValue(data);
    }, error => {
      console.log(error);
    } );
  }

  parentUniqueValidator(controlName: string) {
    return ac => {
      return this.validatorService.isUnique$(
        'communityregistrationrequests',
        controlName,
        ac,
        {
          exceptions: [ this.configuration[controlName] ],
          opts: { domain: ac.parent.get('parentDomain').value }
        }
      );
    };
  }

  confirmConfigurationFormGroup() {
    if (this.configurationFormGroup.valid) {
      if (!this.isAdvancedOptionsChanged || this.isAdvancedOptionConfirmed) {
        this.stepper.next();
      }
    }
  }

  localDomainChange(event) {
    this.isAdvancedOptionsChanged = (this.defaultLocal !== event.target.value);
  }

  resetDefault() {
    this.isAdvancedOptionConfirmed = false;
    this.isAdvancedOptionsChanged = false;
    this.configurationFormGroup.get('localDomain').setValue(this.defaultLocal);
  }

  planetNameChange(event) {
    if (this.configurationType !== 'update') {
      let code = this.configurationFormGroup.get('name').value;
      // convert special character to dot except last character
      code = code.replace(/\W+(?!$)/g, '.').toLowerCase();
      // skip special character if comes as last character
      code = code.replace(/\W+$/, '').toLowerCase();
      this.configurationFormGroup.get('code').setValue(code);
    }
  }

  getNationList() {
    this.couchService.post('communityregistrationrequests/_find',
      findDocuments({ 'planetType': 'nation', 'registrationRequest': 'accepted' }, 0 ),
      { domain: environment.centerAddress, protocol: environment.centerProtocol })
      .subscribe((data) => {
        this.nations = data.docs;
      }, (error) => this.planetMessageService.showAlert('There is a problem getting the list of nations'));
  }

  onChange(selectedValue: string) {
    this.nationOrCommunity = selectedValue;
    if (selectedValue === 'nation') {
      this.configurationFormGroup.patchValue({
        planetType: selectedValue,
        parentDomain: environment.centerAddress
      });
    } else {
      this.configurationFormGroup.patchValue({
        planetType: selectedValue,
        parentDomain: ''
      });
    }
  }

  onChangeNation() {
    if (this.configurationFormGroup.get('name').value !== '') {
      this.configurationFormGroup.controls.name.updateValueAndValidity();
      this.configurationFormGroup.controls.code.updateValueAndValidity();
    }
  }

  onSubmitConfiguration() {
    if (this.configurationType === 'update') {
      this.updateConfiguration();
    } else if (this.loginForm.valid && this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      const {
        confirmPassword,
        ...credentials
      } = this.loginForm.value;
      const adminName = credentials.name + '@' + this.configurationFormGroup.controls.code.value;
      const configuration = Object.assign({
          registrationRequest: 'pending',
          adminName
        },
        this.configurationFormGroup.value, this.contactFormGroup.value);
      const userDetail: any = {
        ...credentials,
        'roles': [],
        'type': 'user',
        'isUserAdmin': true,
        'joinDate': Date.now(),
        'parentCode': configuration.code,
        ...this.contactFormGroup.value
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
          this.couchService.put('_users/org.couchdb.user:' + credentials.name, userDetail),
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

  updateConfiguration() {
     if (this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      const configuration = Object.assign(
        this.configuration,
        this.configurationFormGroup.value,
        this.contactFormGroup.value
      );
      this.couchService.put(
        'configurations/' + this.configuration._id,
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
