import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { TitleCasePipe, KeyValuePipe } from '@angular/common';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { StateService } from '@shared/state.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';

import { ProviderName } from '../../chat/chat.model';
import { ConfigurationService } from '../../configuration/configuration.service';
import { ManagerKeysComponent } from './manager-keys.component';

const DEFAULT_AI_PROVIDERS: Record<ProviderName, string> = {
  openai: '',
  perplexity: '',
  deepseek: '',
  gemini: ''
};

interface FixedConfigFormControls {
  streaming: FormControl<boolean>;
  assistantName: FormControl<string>;
  assistantInstructions: FormControl<string>;
}

type DynamicConfigControlKey = `models_${string}`;
type DynamicConfigFormControls = Partial<Record<DynamicConfigControlKey, FormControl<string>>>;
type ConfigFormControls = FixedConfigFormControls & DynamicConfigFormControls;

interface AIConfiguration {
  [key: string]: unknown;
  streaming?: boolean;
  models?: Record<string, unknown>;
  assistant?: {
    name?: string;
    instructions?: string;
  };
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
    MatSlideToggle,
    MatTooltip,
    MatButton,
    TitleCasePipe,
    KeyValuePipe,
    ManagerKeysComponent
  ]
})
export class ManagerAIServicesComponent implements OnInit, OnDestroy {
  @ViewChild(ManagerKeysComponent) keysCard: ManagerKeysComponent;
  configuration: AIConfiguration = {};
  configForm: FormGroup<ConfigFormControls>;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: NonNullableFormBuilder,
    private configurationService: ConfigurationService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.configForm = this.fb.group<ConfigFormControls>({
      streaming: this.fb.control(false),
      assistantName: this.fb.control(''),
      assistantInstructions: this.fb.control('')
    });
  }

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    this.configuration.models = { ...DEFAULT_AI_PROVIDERS, ...this.configuration.models };
    this.initForm();
  }

  ngOnDestroy() {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  initForm() {
    this.configForm = this.fb.group<ConfigFormControls>({
      streaming: this.fb.control(!!this.configuration.streaming),
      ...this.mapConfigToFormControls(this.configuration.models, 'models_'),
      assistantName: this.fb.control(this.configuration.assistant?.name || ''),
      assistantInstructions: this.fb.control(this.configuration.assistant?.instructions || '')
    });
  }

  mapConfigToFormControls(configObject: Record<string, unknown> | undefined, prefix: 'models_'): DynamicConfigFormControls {
    const formGroupObj: DynamicConfigFormControls = {};
    if (configObject) {
      for (const key of Object.keys(configObject)) {
        formGroupObj[`${prefix}${key}`] = this.fb.control(String(configObject[key] ?? ''));
      }
    }
    return formGroupObj;
  }

  saveConfig() {
    if (!this.configuration?._id || !this.configForm.valid) {
      return;
    }
    this.dialogsLoadingService.start();
    const configPatch = {
      streaming: this.configForm.controls.streaming.value,
      models: this.extractFormValues(this.configuration.models, 'models_'),
      assistant: {
        name: this.getStringControlValue('assistantName'),
        instructions: this.getStringControlValue('assistantInstructions')
      }
    };
    this.keysCard.saveKeys().pipe(
      switchMap(() => this.configurationService.patchLocalConfiguration(configPatch)),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(
      () => this.stateService.requestData('configurations', 'local'),
      err => {
        this.planetMessageService.showAlert($localize`There was an error updating the configuration`);
      }, () => {
        this.router.navigate([ '/manager' ]);
        this.planetMessageService.showMessage($localize`Configuration Updated Successfully`);
      }
    );
  }

  extractFormValues(configObject: Record<string, unknown> | undefined, prefix: 'models_'): Record<string, string> {
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

}
