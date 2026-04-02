import { Component, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, AsyncValidatorFn, FormControl, FormGroup, NonNullableFormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatStepper, MatStep, MatStepLabel, MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
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
import { NgIf, NgFor } from '@angular/common';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { LowercaseDirective } from '../shared/lowercase.directive';
import { RestrictDiacriticsDirective } from '../shared/restrict-diacritics.directives';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { MatButton, MatMiniFabButton } from '@angular/material/button';
import { MatSelect } from '@angular/material/select';
import { MatOption, MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { SubmitDirective } from '../shared/submit.directive';

const removeProtocol = (str: string) => {
  // RegEx grabs the fragment of the string between '//' and last character
  // First match includes characters, second does not (so we use second)
  return /\/\/(.*?)$/.exec(str)[1];
};

interface LoginForm {
  name: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}

type DatePlaceholder = CouchService['datePlaceholder'];

interface ConfigurationForm {
  planetType: FormControl<string>;
  localDomain: FormControl<string>;
  name: FormControl<string>;
  parentDomain: FormControl<string>;
  parentCode: FormControl<string>;
  preferredLang: FormControl<string>;
  code: FormControl<string>;
  createdDate: FormControl<number | DatePlaceholder>;
  autoAccept: FormControl<boolean>;
  alwaysOnline: FormControl<boolean>;
  betaEnabled: FormControl<string>;
}

interface ContactForm {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  middleName: FormControl<string>;
  email: FormControl<string>;
  phoneNumber: FormControl<string>;
}

@Component({
    selector: 'planet-configuration',
    templateUrl: './configuration.component.html',
    styles: [`
    .mat-mdc-raised-button {
      margin: 0px 2px 2px 0px;
    }
    .configuration-form {
      align-items: start;
    }
    .configuration-form mat-form-field {
      width: 100%;
    }
    .advanced {
      grid-column-start: 2;
    }
    .advanced-options-container {
      display: flex;
      flex-direction: column;
    }

    .advanced-options-container > * {
      margin-bottom: 10px;
    }
  `],
    imports: [MatStepper, NgIf, MatStep, MatStepLabel, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, LowercaseDirective, RestrictDiacriticsDirective, MatError, FormErrorMessagesComponent, MatButton, MatStepperNext, MatSelect, MatOption, NgFor, MatAutocompleteTrigger, MatAutocomplete, MatSlideToggle, MatTooltip, MatIcon, MatCheckbox, MatMiniFabButton, MatStepperPrevious, SubmitDirective]
})
export class ConfigurationComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  configurationType = 'new';
  nationOrCommunity = 'community';
  message = '';
  loginForm!: FormGroup<LoginForm>;
  configurationFormGroup!: FormGroup<ConfigurationForm>;
  contactFormGroup!: FormGroup<ContactForm>;
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
        validators: [
          Validators.required,
          CustomValidators.matchPassword('confirmPassword', false)
        ]
      }),
      confirmPassword: this.formBuilder.control('', {
        validators: [
          Validators.required,
          CustomValidators.matchPassword('password', true)
        ]
      })
    });
    this.configurationFormGroup = this.formBuilder.group({
      planetType: this.formBuilder.control('', { validators: [ Validators.required ] }),
      localDomain: this.formBuilder.control(this.defaultLocal),
      name: this.formBuilder.control('', {
        validators: [ Validators.required, Validators.pattern(/^[A-Za-z0-9]/i) ],
        asyncValidators: [ this.parentUniqueValidator('name') ]
      }),
      parentDomain: this.formBuilder.control('', { validators: [ Validators.required ] }),
      parentCode: this.formBuilder.control('', { validators: [ Validators.required ] }),
      preferredLang: this.formBuilder.control('', { validators: [ Validators.required ] }),
      code: this.formBuilder.control('', {
        validators: [ Validators.required ],
        asyncValidators: [ this.parentUniqueValidator('code') ]
      }),
      createdDate: this.formBuilder.control<number | DatePlaceholder>(this.couchService.datePlaceholder),
      autoAccept: this.formBuilder.control(true),
      alwaysOnline: this.formBuilder.control(false),
      betaEnabled: this.formBuilder.control('off')
    });
    this.contactFormGroup = this.formBuilder.group({
      firstName: this.formBuilder.control('', { validators: [ CustomValidators.required ] }),
      lastName: this.formBuilder.control('', { validators: [ CustomValidators.required ] }),
      middleName: this.formBuilder.control(''),
      email: this.formBuilder.control('', { validators: [ Validators.required, Validators.email ] }),
      phoneNumber: this.formBuilder.control('', { validators: [ CustomValidators.required ] })
    });
    this.getNationList();
  }

  initUpdate() {
    this.configurationType = 'update';
    const configurationId = this.stateService.configuration._id;
    this.couchService.get('configurations/' + configurationId).subscribe((data: any) => {
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
      const parentDomain = (ac.parent as FormGroup<ConfigurationForm>)?.controls.parentDomain.value;
      return this.validatorService.isUnique$(
        'communityregistrationrequests',
        controlName,
        ac,
        {
          exceptions: [ this.configuration[controlName] ],
          opts: { domain: parentDomain }
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
    this.configurationFormGroup.controls.localDomain.setValue(this.defaultLocal);
  }

  planetNameChange() {
    if (this.configurationType !== 'update') {
      let code = this.configurationFormGroup.controls.name.value;
      // convert special character to dot except last character
      code = code.replace(/\W+(?!$)/g, '.').toLowerCase();
      // skip special character if comes as last character
      code = code.replace(/\W+$/, '').toLowerCase();
      this.configurationFormGroup.controls.code.setValue(code);
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
    const parentDomain = this.configurationFormGroup.controls.parentDomain.value;
    const parentCode = this.nations.find(n => n.localDomain === parentDomain);
    this.configurationFormGroup.controls.parentCode.setValue(parentCode?.code ?? '');
    if (this.configurationFormGroup.controls.name.value !== '') {
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
