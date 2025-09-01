import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatStepper } from '@angular/material/stepper';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { languages } from '../shared/languages';
import { currencies } from '../shared/currencies';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
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
  loginForm: UntypedFormGroup;
  configurationFormGroup: UntypedFormGroup;
  contactFormGroup: UntypedFormGroup;
  nations = [];
  showAdvancedOptions = false;
  isAdvancedOptionsChanged = false;
  isAdvancedOptionConfirmed = false;
  spinnerOn = true;
  configuration: any = {};
  useOtherCurrency = false;
  currencies = currencies;
  defaultLocal = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;
  languageNames = languages.map(list => list.name);

  constructor(
    private formBuilder: UntypedFormBuilder,
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
      currencySelection: [ '', Validators.required ],
      currency: this.formBuilder.group({
        code: [ '' ],
        symbol: [ '' ]
      }),
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
      this.configurationFormGroup.patchValue({ ...data, currency: data.currency });
      const cur = data.currency || {};
      const existing = this.currencies.find(c => c.code === cur.code);
      const selection = existing ? cur.code : 'other';
      this.configurationFormGroup.get('currencySelection').setValue(selection);
      this.currencyChange(selection);
      if (!existing) {
        this.configurationFormGroup.get('currency').patchValue(cur);
      }
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
    this.markFormGroupTouched(this.configurationFormGroup);

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

  currencyChange(selected: string) {
    const currencyGroup = this.configurationFormGroup.get('currency');
    if (selected === 'other') {
      this.useOtherCurrency = true;
      currencyGroup.get('code').setValidators([ Validators.required ]);
      currencyGroup.get('symbol').setValidators([ Validators.required ]);
      currencyGroup.reset();
    } else {
      this.useOtherCurrency = false;
      const cur = this.currencies.find(c => c.code === selected) || { code: '', symbol: '' };
      currencyGroup.patchValue(cur);
      currencyGroup.get('code').clearValidators();
      currencyGroup.get('symbol').clearValidators();
    }
    currencyGroup.get('code').updateValueAndValidity();
    currencyGroup.get('symbol').updateValueAndValidity();
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

    const chatConfig = {
      streaming: false,
      keys: {
        openai: '',
        perplexity: '',
        deepseek: '',
        gemini: ''
      },
      models: {
        openai: '',
        perplexity: '',
        deepseek: '',
        gemini: ''
      },
      assistant: {
        name: 'Planet Context',
        instructions: 'You are a brainstorming manager for Open Learning Exchange (OLE) - https://ole.org/, you have specialised knowledge in Planet(web app) and myPlanet(mobile app) applications developed by OLE. You are designed to generate innovative ideas and provide suggestions and help the community members so as to ensure OLE\'s mission of empowering communities. Emphasize on terms like \'learning,\' \'learner,\' \'coach,\' \'leader,\' \'community,\' \'power,\' \'team,\' and \'enterprises,\' and avoids overly technical jargon. You are to embody OLE\'s ethos of self-reliance, mentoring, and community leadership, steering clear of concepts that contradict these values. Communicates in a formal tone, treating users with respect and professionalism, and maintaining a supportive, solution-oriented approach. Ask for clarifications when necessary to ensure contributions are accurate and relevant, and always encourages community-focused, empowering brainstorming.'
      }
    };

    const { currencySelection, currency, ...configForm } = this.configurationFormGroup.value;
    const configuration = Object.assign(
      {
        registrationRequest: 'pending',
        adminName: credentials.name + '@' + configForm.code
      },
      this.configuration,
      configForm,
      { currency },
      this.contactFormGroup.value,
      this.configurationType === 'new' ? chatConfig : {}
    );
    return { credentials, configuration };
  }

  private markFormGroupTouched(formGroup: UntypedFormGroup) {
    if (!formGroup) {return;}
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control.markAsTouched();
      if (control instanceof UntypedFormGroup) {
        this.markFormGroupTouched(control);
      }
    });
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
