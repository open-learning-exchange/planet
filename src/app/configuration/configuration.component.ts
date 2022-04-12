import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
import { MatStepper } from '@angular/material/stepper';
import { Router, ActivatedRoute } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { environment } from '../../environments/environment';
import { finalize } from 'rxjs/operators';
import { debug } from '../debug-operator';
import { ConfigurationService } from './configuration.service';
import { StateService } from '../shared/state.service';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and last character
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)$/.exec(str)[1];
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
  spinnerOn = true;
  configuration: any = {};
  defaultLocal = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;

  constructor(
    private formBuilder: FormBuilder,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private validatorService: ValidatorService,
    private router: Router,
    private route: ActivatedRoute,
    private configurationService: ConfigurationService,
    private stateService: StateService
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
      parentCode: [ '', Validators.required ],
      preferredLang: [ '', Validators.required ],
      code: [
        '',
        Validators.required,
        this.parentUniqueValidator('code')
      ],
      createdDate: this.couchService.datePlaceholder,
      autoAccept: true,
      alwaysOnline: false,
      betaEnabled: 'off'
    });
    this.contactFormGroup = this.formBuilder.group({
      firstName: [ '', CustomValidators.required ],
      lastName: [ '', CustomValidators.required ],
      middleName: [ '' ],
      email: [
        '',
        Validators.compose([
          Validators.required,
          Validators.email
        ])
      ],
      phoneNumber: [ '', CustomValidators.required ]
    });
    this.getNationList();
  }

  initUpdate() {
    this.configurationType = 'update';
    const configurationId = this.stateService.configuration._id;
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
      }, (error) => this.planetMessageService.showAlert($localize`There is a problem getting the list of nations`));
  }

  onChange(selectedValue: string) {
    this.nationOrCommunity = selectedValue;
    if (selectedValue === 'nation') {
      this.configurationFormGroup.patchValue({
        planetType: selectedValue,
        parentDomain: environment.centerAddress,
        parentCode: 'earth'
      });
    } else {
      this.configurationFormGroup.patchValue({
        planetType: selectedValue,
        parentDomain: '',
        parentCode: ''
      });
    }
  }

  onChangeNation() {
    const parentCode = this.nations.find(n => n.localDomain === this.configurationFormGroup.get('parentDomain').value);
    this.configurationFormGroup.get('parentCode').setValue(parentCode.code);
    if (this.configurationFormGroup.get('name').value !== '') {
      this.configurationFormGroup.controls.name.updateValueAndValidity();
      this.configurationFormGroup.controls.code.updateValueAndValidity();
    }
  }

  allValid() {
    return (this.configurationType === 'update' || this.loginForm.valid) &&
      this.configurationFormGroup.valid &&
      this.contactFormGroup.valid;
  }

  createConfigurationDocs() {
    const {
      confirmPassword,
      ...credentials
    } = this.loginForm.value;
    const configuration = Object.assign(
      {
        registrationRequest: 'pending',
        adminName: credentials.name + '@' + this.configurationFormGroup.controls.code.value
      },
      this.configuration, this.configurationFormGroup.value, this.contactFormGroup.value
    );
    return { credentials, configuration };
  }

  onSubmitConfiguration() {
    const spinnerOff = () => this.spinnerOn = false;
    if (!this.allValid()) {
      spinnerOff();
      return;
    }
    this.spinnerOn = true;
    const { credentials, configuration } = this.createConfigurationDocs();
    if (this.configurationType === 'update') {
      this.configurationService.updateConfiguration(configuration).pipe(finalize(spinnerOff)).subscribe(
        () => this.stateService.requestData('configurations', 'local'),
        err => {
          this.planetMessageService.showAlert($localize`There was an error updating the configuration`);
        }, () => {
          this.router.navigate([ '/manager' ]);
          this.planetMessageService.showMessage($localize`Configuration Updated Successfully`);
        }
      );
    } else {
      const admin = Object.assign(credentials, this.contactFormGroup.value);
      this.configurationService.createPlanet(admin, configuration, credentials).pipe(finalize(spinnerOff)).subscribe((data) => {
        this.planetMessageService.showMessage($localize`Admin created: ${credentials.name}`);
        this.router.navigate([ '/login' ]);
      }, (error) => this.planetMessageService.showAlert($localize`There was an error creating planet`));
    }
  }

}
