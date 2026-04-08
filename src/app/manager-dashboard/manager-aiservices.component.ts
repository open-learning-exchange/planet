import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';

interface FixedConfigFormControls {
  streaming: FormControl<boolean>;
  assistantEnabled: FormControl<boolean>;
  assistantName: FormControl<string>;
  assistantInstructions: FormControl<string>;
}

type DynamicConfigControlKey = `keys_${string}` | `models_${string}`;
type DynamicConfigFormControls = Partial<Record<DynamicConfigControlKey, FormControl<string>>>;
type ConfigFormControls = FixedConfigFormControls & DynamicConfigFormControls;

interface AIConfiguration {
  streaming?: boolean;
  keys?: Record<string, unknown>;
  models?: Record<string, unknown>;
  assistant?: {
    enabled?: boolean;
    name?: string;
    instructions?: string;
  };
  [key: string]: unknown;
}

@Component({
  templateUrl: './manager-aiservices.component.html',
  styleUrls: ['./manager-settings.shared.scss'],
  standalone: false
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
      assistantEnabled: this.fb.control(true),
      assistantName: this.fb.control(''),
      assistantInstructions: this.fb.control('')
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
      assistantEnabled: this.fb.control(this.configuration.assistant?.enabled ?? true),
      ...this.mapConfigToFormControls(this.configuration.keys, 'keys_'),
      ...this.mapConfigToFormControls(this.configuration.models, 'models_'),
      assistantName: this.fb.control(this.configuration.assistant?.name || ''),
      assistantInstructions: this.fb.control(this.configuration.assistant?.instructions || '')
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
    const updatedConfig = {
      ...this.configuration,
      streaming: this.configForm.controls.streaming.value,
      keys: this.extractFormValues(this.configuration.keys, 'keys_'),
      models: this.extractFormValues(this.configuration.models, 'models_'),
      assistant: {
        enabled: this.configForm.controls.assistantEnabled.value,
        name: this.getStringControlValue('assistantName'),
        instructions: this.getStringControlValue('assistantInstructions')
      }
    };
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
