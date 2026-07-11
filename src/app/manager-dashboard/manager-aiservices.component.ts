import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { TitleCasePipe, KeyValuePipe } from '@angular/common';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { SubmitDirective } from '../shared/submit.directive';

interface FixedConfigFormControls {
  streaming: FormControl<boolean>;
  promptGeneralChat: FormControl<string>;
  promptCourseHelp: FormControl<string>;
  promptSurveyAnalysis: FormControl<string>;
}

type DynamicConfigControlKey = `keys_${string}` | `models_${string}`;
type DynamicConfigFormControls = Partial<Record<DynamicConfigControlKey, FormControl<string>>>;
type ConfigFormControls = FixedConfigFormControls & DynamicConfigFormControls;

interface AIConfiguration {
  streaming?: boolean;
  /** Legacy single-assistant config, superseded by promptProfiles; deleted on save. */
  assistant?: { instructions?: string };
  keys?: Record<string, unknown>;
  models?: Record<string, unknown>;
  promptProfiles?: {
    general_chat?: string;
    course_help?: string;
    survey_analysis?: string;
  };
  [key: string]: unknown;
}

@Component({
  templateUrl: './manager-aiservices.component.html',
  styleUrls: ['./manager-settings.shared.scss'],
  imports: [
    MatToolbar,
    MatIconButton,
    RouterLink,
    MatIcon,
    FormsModule,
    ReactiveFormsModule,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatList,
    MatListItem,
    MatListItemTitle,
    MatFormField,
    MatLabel,
    MatInput,
    MatSuffix,
    MatSlideToggle,
    MatTooltip,
    MatButton,
    SubmitDirective,
    TitleCasePipe,
    KeyValuePipe
  ]
})
export class ManagerAIServicesComponent implements OnInit, OnDestroy {
  configuration: AIConfiguration = {};
  configForm: FormGroup<ConfigFormControls>;
  hideKey: { [key: string]: boolean } = {};
  spinnerOn = true;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: NonNullableFormBuilder,
    private clipboard: Clipboard,
    private configurationService: ConfigurationService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private stateService: StateService,
  ) {
    this.configForm = this.fb.group<ConfigFormControls>({
      streaming: this.fb.control(false),
      promptGeneralChat: this.fb.control(''),
      promptCourseHelp: this.fb.control(''),
      promptSurveyAnalysis: this.fb.control('')
    });
  }

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    this.configuration.keys = this.stateService.keys;
    this.initForm();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  initForm() {
    this.configForm = this.fb.group<ConfigFormControls>({
      streaming: this.fb.control(!!this.configuration.streaming),
      ...this.mapConfigToFormControls(this.configuration.keys, 'keys_'),
      ...this.mapConfigToFormControls(this.configuration.models, 'models_'),
      // Surface the legacy assistant instructions (still served as general_chat by the
      // gateway) so they aren't silently lost when the save deletes `assistant`
      promptGeneralChat: this.fb.control(
        this.configuration.promptProfiles?.general_chat || this.configuration.assistant?.instructions || ''
      ),
      promptCourseHelp: this.fb.control(this.configuration.promptProfiles?.course_help || ''),
      promptSurveyAnalysis: this.fb.control(this.configuration.promptProfiles?.survey_analysis || '')
    });

    if (this.configuration.keys) {
      for (const key of Object.keys(this.configuration.keys)) {
        this.hideKey[key] = true;
      }
    }
  }

  mapConfigToFormControls(configObject: Record<string, unknown> | undefined, prefix: 'keys_' | 'models_'): DynamicConfigFormControls {
    const formGroupObj: DynamicConfigFormControls = {};
    if (configObject) {
      for (const key of Object.keys(configObject)) {
        formGroupObj[`${prefix}${key}`] = this.fb.control(String(configObject[key] ?? ''));
      }
    }
    return formGroupObj;
  }

  saveConfig() {
    const spinnerOff = () => this.spinnerOn = false;
    if (!this.configForm.valid) {
      spinnerOff();
      return;
    }
    this.spinnerOn = true;
    const updatedConfig: AIConfiguration = {
      ...this.configuration,
      streaming: this.configForm.controls.streaming.value,
      keys: this.extractFormValues(this.configuration.keys, 'keys_'),
      models: this.extractFormValues(this.configuration.models, 'models_'),
      promptProfiles: {
        general_chat: this.getStringControlValue('promptGeneralChat'),
        course_help: this.getStringControlValue('promptCourseHelp'),
        survey_analysis: this.getStringControlValue('promptSurveyAnalysis')
      }
    };
    // The legacy single-assistant config is superseded by prompt profiles
    delete updatedConfig.assistant;
    this.configurationService.updateConfiguration(updatedConfig).pipe(finalize(spinnerOff)).subscribe(
      () => this.stateService.requestData('configurations', 'local'),
      err => {
        this.planetMessageService.showAlert($localize`There was an error updating the configuration`);
      }, () => {
        this.router.navigate([ '/manager' ]);
        this.planetMessageService.showMessage($localize`Configuration Updated Successfully`);
      }
    );
  }

  extractFormValues(configObject: Record<string, unknown> | undefined, prefix: 'keys_' | 'models_'): Record<string, string> {
    const values: Record<string, string> = {};
    if (!configObject) {
      return values;
    }
    for (const key of Object.keys(configObject)) {
      values[key] = this.getStringControlValue(prefix + key);
    }
    return values;
  }

  private getStringControlValue(controlName: string): string {
    const value = this.configForm.get(controlName)?.value;
    return typeof value === 'string' ? value : '';
  }

  toggleHideKey(key: string) {
    this.hideKey[key] = !this.hideKey[key];
  }

  copyKey(key: string) {
    const value = this.getStringControlValue('keys_' + key);
    this.clipboard.copy(value);
  }

}
