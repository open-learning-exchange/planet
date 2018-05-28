import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
import { MatStepper } from '@angular/material';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';
import { switchMap, mergeMap } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { UserService } from '../shared/user.service';
import { fromPromise } from 'rxjs/observable/fromPromise';
import { of } from 'rxjs/observable/of';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and '/'
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)\//.exec(str)[1];
};

@Component({
  selector: 'planet-configuration',
  templateUrl: './configuration.component.html'
})
export class ConfigurationComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  nationOrCommunity = 'community';
  message = '';
  loginForm: FormGroup;
  configurationFormGroup: FormGroup;
  contactFormGroup: FormGroup;
  nations = [];
  showAdvancedOptions = false;
  isAdvancedOptionsChanged = false;
  isAdvancedOptionConfirmed = false;
  defaultLocal = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;

  constructor(
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      name: [ '', [
        Validators.required,
        CustomValidators.pattern(/^[A-Za-z0-9]/i, 'invalidFirstCharacter'),
        Validators.pattern(/^[a-z0-9_.-]*$/i) ]
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
      parentDomain: [ '' ],
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

  parentUniqueValidator(controlName: string) {
    return ac => this.validatorService.isUnique$(
      'communityregistrationrequests',
      controlName,
      ac,
      { domain: ac.parent.get('parentDomain').value }
    );
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
    let code = this.configurationFormGroup.get('name').value;
    // convert special character to dot except last character
    code = code.replace(/\W+(?!$)/g, '.').toLowerCase();
    // skip special character if comes as last character
    code = code.replace(/\W+$/, '').toLowerCase();
    this.configurationFormGroup.get('code').setValue(code);
  }

  getNationList() {
    this.couchService.post('nations/_find',
      findDocuments({ 'planetType': 'nation' }, 0 ),
      { domain: environment.centerAddress })
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

  onSubmitConfiguration() {
    if (this.loginForm.valid && this.configurationFormGroup.valid && this.contactFormGroup.valid) {
      const { confirmPassword, ...credentials } = this.loginForm.value;
      const adminName = credentials.name + '@' + this.configurationFormGroup.controls.code.value;
      const configuration = Object.assign({ registrationRequest: 'pending', adminName },
        this.configurationFormGroup.value, this.contactFormGroup.value);
      const userDetail: any = {
        ...credentials,
        'roles': [],
        'type': 'user',
        'isUserAdmin': true,
        'joinDate': Date.now(),
        ...this.contactFormGroup.value
      };
      forkJoin([
        // When creating a planet, add admin
        this.couchService.put('_node/nonode@nohost/_config/admins/' + credentials.name, credentials.password),
        // then add user with same credentials
        this.couchService.put('_users/org.couchdb.user:' + credentials.name, userDetail),
        // then add a shelf for that user
        this.couchService.put('shelf/org.couchdb.user:' + credentials.name, { }),
        // then add configuration
        this.couchService.post('configurations', configuration)
      ]).pipe(debug('Setting up planet')).pipe(switchMap(data => {
        return this.couchService.post('_session', credentials, { withCredentials: true })
        .pipe(switchMap((session) => {
          // Navigate into app
          const routePath = configuration.parentDomain ? [ '/manager/configuration/connect' ] : [ '/' ];
          return fromPromise( this.router.navigate( routePath ) );
        }), switchMap((routeSuccess) => {
          // Post new session info to login_activity
          return this.userService.newSessionLog();
        }));
      })).subscribe((data) => {
        this.planetMessageService.showMessage('Admin created: ' + credentials.name);
      }, (error) => this.planetMessageService.showAlert('There was an error creating planet'));
    }
  }

}
