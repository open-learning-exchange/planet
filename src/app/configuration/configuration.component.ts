import { Component, OnInit, ViewChild } from '@angular/core';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  Validators
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatStepper } from '@angular/material/stepper';
import { finalize } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { languages } from '../shared/languages';
import { CouchService } from '../shared/couchdb.service';
import { ValidatorService } from '../validators/validator.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { CustomValidators } from '../validators/custom-validators';
import { findDocuments } from '../shared/mangoQueries';
import { ConfigurationService } from './configuration.service';
import { StateService } from '../shared/state.service';
import { baseContextPrompt } from '../shared/ai-prompts.constants';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and last character
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)$/.exec(str)[1];
};

type LoginFormControls = {
  name: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
};

type DatePlaceholder = CouchService['datePlaceholder'];

type ConfigurationFormControls = {
  planetType: FormControl<string>;
  localDomain: FormControl<string>;
  name: FormControl<string>;
  parentDomain: FormControl<string>;
  parentCode: FormControl<string>;
  preferredLang: FormControl<string>;
  code: FormControl<string>;
  createdDate: FormControl<DatePlaceholder>;
  autoAccept: FormControl<boolean>;
  alwaysOnline: FormControl<boolean>;
  betaEnabled: FormControl<string>;
};

type ContactFormControls = {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  middleName: FormControl<string>;
  email: FormControl<string>;
  phoneNumber: FormControl<string>;
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
  loginForm: FormGroup<LoginFormControls>;
  configurationFormGroup: FormGroup<ConfigurationFormControls>;
  contactFormGroup: FormGroup<ContactFormControls>;
  nations = [];
  showAdvancedOptions = false;
  isAdvancedOptionsChanged = false;
  isAdvancedOptionConfirmed = false;
  spinnerOn = true;
  configuration: any = {};
  defaultLocal = environment.couchAddress.indexOf('http') > -1 ? removeProtocol(environment.couchAddress) : environment.couchAddress;
  languageNames = languages.map(list => list.name);

  constructor(
    private formBuilder: NonNullableFormBuilder,
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
      name: this.formBuilder.control('', {
        validators: [
          Validators.required,
          CustomValidators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9])/i, 'invalidFirstCharacter'),
          Validators.pattern(/^([^\x00-\x7F]|[A-Za-z0-9_.-])*$/i)
        ]
      }),
      password: this.formBuilder.control('', {
        validators: Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('confirmPassword', false)
        ]) || []
      }),
      confirmPassword: this.formBuilder.control('', {
        validators: Validators.compose([
          Validators.required,
          CustomValidators.matchPassword('password', true)
        ]) || []
      })
    });
    const configurationControls = {
      planetType: this.formBuilder.control('', { validators: Validators.required }),
      localDomain: this.formBuilder.control(this.defaultLocal),
      name: this.formBuilder.control('', {
        validators: [ Validators.required, Validators.pattern(/^[A-Za-z0-9]/i) ],
        asyncValidators: this.parentUniqueValidator('name')
      }),
      parentDomain: this.formBuilder.control('', { validators: Validators.required }),
      parentCode: this.formBuilder.control('', { validators: Validators.required }),
      preferredLang: this.formBuilder.control('', { validators: Validators.required }),
      code: this.formBuilder.control('', {
        validators: Validators.required,
        asyncValidators: this.parentUniqueValidator('code')
      }),
      createdDate: this.formBuilder.control(this.couchService.datePlaceholder),
      autoAccept: this.formBuilder.control(true),
      alwaysOnline: this.formBuilder.control(false),
      betaEnabled: this.formBuilder.control('off')
    } satisfies ConfigurationFormControls;

    this.configurationFormGroup = this.formBuilder.group(configurationControls);
    this.contactFormGroup = this.formBuilder.group({
      firstName: this.formBuilder.control('', { validators: CustomValidators.required }),
      lastName: this.formBuilder.control('', { validators: CustomValidators.required }),
      middleName: this.formBuilder.control(''),
      email: this.formBuilder.control('', {
        validators: Validators.compose([
          Validators.required,
          Validators.email
        ]) || []
      }),
      phoneNumber: this.formBuilder.control('', { validators: CustomValidators.required })
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

  parentUniqueValidator(controlName: 'name' | 'code'): AsyncValidatorFn {
    return (ac: AbstractControl<string>) => {
      const parentDomainControl = ac.parent?.get('parentDomain') as AbstractControl<string> | null;
      return this.validatorService.isUnique$(
        'communityregistrationrequests',
        controlName,
        ac,
        {
          exceptions: [ this.configuration[controlName] ],
          opts: { domain: parentDomainControl?.value }
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

  localDomainChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.isAdvancedOptionsChanged = (this.defaultLocal !== target.value);
  }

  resetDefault() {
    this.isAdvancedOptionConfirmed = false;
    this.isAdvancedOptionsChanged = false;
    this.configurationFormGroup.get('localDomain').setValue(this.defaultLocal);
  }

  planetNameChange(event: Event) {
    event.preventDefault();
    if (this.configurationType !== 'update') {
      const nameControl = this.configurationFormGroup.get('name');
      if (!nameControl) {
        return;
      }
      let code = nameControl.value;
      // convert special character to dot except last character
      code = code.replace(/\W+(?!$)/g, '.').toLowerCase();
      // skip special character if comes as last character
      code = code.replace(/\W+$/, '').toLowerCase();
      this.configurationFormGroup.get('code')?.setValue(code);
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
    const parentDomain = this.configurationFormGroup.get('parentDomain')?.value;
    const parentCode = this.nations.find(n => n.localDomain === parentDomain);
    this.configurationFormGroup.get('parentCode')?.setValue(parentCode?.code ?? '');
    if (this.configurationFormGroup.get('name')?.value !== '') {
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
        instructions: baseContextPrompt,
      }
    };

    const configuration = Object.assign(
      {
        registrationRequest: 'pending',
        adminName: credentials.name + '@' + this.configurationFormGroup.controls.code.value
      },
      this.configuration,
      this.configurationFormGroup.value,
      this.contactFormGroup.value,
      this.configurationType === 'new' ? chatConfig : {}
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
