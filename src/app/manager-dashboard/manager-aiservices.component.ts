import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { SubmitDirective } from '../shared/submit.directive';
import { ChatService } from '../shared/chat.service';
import { AIServiceDiscovery, PromptProfiles } from '../chat/chat.model';

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
    SubmitDirective
  ]
})
export class ManagerAIServicesComponent implements OnInit, OnDestroy {
  configuration: AIConfiguration = {};
  configForm: FormGroup<ConfigFormControls>;
  hideKey: { [key: string]: boolean } = {};
  promptDefaults: PromptProfiles = {
    'general_chat': '',
    'course_help': '',
    'survey_analysis': ''
  };
  providerNames: string[] = [];
  providerLabels: Record<string, string> = {};
  providerDiscoveryFailed = false;
  spinnerOn = true;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: NonNullableFormBuilder,
    private clipboard: Clipboard,
    private chatService: ChatService,
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
    this.providerNames = this.configuredProviderNames();
    this.initForm();
    this.chatService.getAIServiceDiscovery()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((discovery) => {
        if (discovery === undefined) {
          return;
        }
        // Once the attempt settles without a registry, say so rather than rendering an empty
        // page: a community seeded with no keys has nothing else to fall back on.
        this.providerDiscoveryFailed = discovery === null;
        if (discovery) {
          this.applyProviderDiscovery(discovery);
        }
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  initForm() {
    this.configForm = this.fb.group<ConfigFormControls>({
      streaming: this.fb.control(!!this.configuration.streaming),
      ...this.mapProviderControls('keys_'),
      ...this.mapProviderControls('models_'),
      promptGeneralChat: this.fb.control(this.configuration.promptProfiles?.general_chat || ''),
      promptCourseHelp: this.fb.control(this.configuration.promptProfiles?.course_help || ''),
      promptSurveyAnalysis: this.fb.control(this.configuration.promptProfiles?.survey_analysis || '')
    });

    for (const name of this.providerNames) {
      this.hideKey[name] = true;
    }
  }

  private configuredProviderNames(): string[] {
    return [ ...new Set([ ...Object.keys(this.configuration.keys || {}), ...Object.keys(this.configuration.models || {}) ]) ];
  }

  private mapProviderControls(prefix: 'keys_' | 'models_'): DynamicConfigFormControls {
    const formGroupObj: DynamicConfigFormControls = {};
    const values = prefix === 'keys_' ? this.configuration.keys : this.configuration.models;
    for (const name of this.providerNames) {
      formGroupObj[`${prefix}${name}`] = this.fb.control(String(values?.[name] ?? ''));
    }
    return formGroupObj;
  }

  private applyProviderDiscovery(discovery: AIServiceDiscovery) {
    this.promptDefaults = discovery.promptDefaults;
    this.providerLabels = Object.fromEntries(Object.entries(discovery.providers)
      .map(([ name, provider ]) => [ name, provider.label || name ]));
    // The gateway registry is authoritative once discovery resolves, so retired or mistyped
    // provider names stop rendering; extractFormValues still carries their stored values.
    this.providerNames = Object.keys(discovery.providers);
    for (const name of this.providerNames) {
      for (const prefix of [ 'keys_', 'models_' ] as const) {
        const controlName = `${prefix}${name}` as DynamicConfigControlKey;
        if (!this.configForm.get(controlName)) {
          const values = prefix === 'keys_' ? this.configuration.keys : this.configuration.models;
          this.configForm.addControl(controlName, this.fb.control(String(values?.[name] ?? '')));
        }
      }
      this.hideKey[name] ??= true;
    }
  }

  providerLabel(name: string): string {
    return this.providerLabels[name] || name;
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
    this.configurationService.updateConfiguration(updatedConfig).pipe(finalize(spinnerOff)).subscribe(
      () => this.stateService.requestData('configurations', 'local'),
      err => {
        this.planetMessageService.showAlert($localize`There was an error updating the configuration`);
      }, () => {
        this.chatService.refreshAIProviders();
        this.router.navigate([ '/manager' ]);
        this.planetMessageService.showMessage($localize`Configuration Updated Successfully`);
      }
    );
  }

  // Stored names outside the registry are saved too: they are no longer rendered, but dropping
  // an operator's key as a side effect of saving would be worse. A name the form still holds a
  // control for is read from that control, so an edit made before discovery replaced the row wins.
  extractFormValues(configObject: Record<string, unknown> | undefined, prefix: 'keys_' | 'models_'): Record<string, string> {
    const stored = configObject || {};
    const names = [ ...new Set([ ...Object.keys(stored), ...this.providerNames ]) ];
    const values: Record<string, string> = {};
    for (const name of names) {
      const value = this.configForm.get(prefix + name)
        ? this.getStringControlValue(prefix + name)
        : String(stored[name] ?? '');
      if (value) {
        values[name] = value;
      }
    }
    return values;
  }

  private getStringControlValue(controlName: string): string {
    const value = this.configForm.get(controlName)?.value;
    return typeof value === 'string' ? value : '';
  }

  hasPromptOverrides(): boolean {
    return [ 'promptGeneralChat', 'promptCourseHelp', 'promptSurveyAnalysis' ]
      .some((controlName) => this.getStringControlValue(controlName).trim() !== '');
  }

  useBuiltInPrompts() {
    this.configForm.patchValue({
      'promptGeneralChat': '',
      'promptCourseHelp': '',
      'promptSurveyAnalysis': ''
    });
  }

  toggleHideKey(key: string) {
    this.hideKey[key] = !this.hideKey[key];
  }

  copyKey(key: string) {
    const value = this.getStringControlValue('keys_' + key);
    this.clipboard.copy(value);
  }

}
