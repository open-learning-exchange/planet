import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './manager-aiservices.component.html',
  styleUrls: [ './manager-settings.shared.scss' ],
})
export class ManagerAIServicesComponent implements OnInit, OnDestroy {
  configuration: any = {};
  configForm: FormGroup;
  hideKey: { [key: string]: boolean } = {};
  spinnerOn = true;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private clipboard: Clipboard,
    private configurationService: ConfigurationService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private stateService: StateService,
  ) {
    this.configForm = this.fb.group({
      streaming: [false],
      assistantName: [''],
      assistantInstructions: ['']
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
    this.configForm = this.fb.group({
      streaming: [!!this.configuration.streaming],
      ...this.mapConfigToFormGroup(this.configuration.keys, 'keys_'),
      ...this.mapConfigToFormGroup(this.configuration.models, 'models_'),
      assistantName: [this.configuration.assistant?.name || ''],
      assistantInstructions: [this.configuration.assistant?.instructions || '']
    });

    if (this.configuration.keys) {
      for (const key of Object.keys(this.configuration.keys)) {
        this.hideKey[key] = true;
      }
    }
  }

  mapConfigToFormGroup(configObject: any, prefix: string) {
    const formGroupObj = {};
    if (configObject) {
      for (const key of Object.keys(configObject)) {
        formGroupObj[prefix + key] = [configObject[key] || ''];
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
      streaming: this.configForm.value.streaming,
      keys: this.extractFormValues(this.configuration.keys, 'keys_'),
      models: this.extractFormValues(this.configuration.models, 'models_'),
      assistant: {
        name: this.configForm.value.assistantName,
        instructions: this.configForm.value.assistantInstructions
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

  extractFormValues(configObject: any, prefix: string) {
    const values = {};
    for (const key of Object.keys(configObject)) {
      values[key] = this.configForm.value[prefix + key];
    }
    return values;
  }

  toggleHideKey(key: string) {
    this.hideKey[key] = !this.hideKey[key];
  }

  copyKey(key: string) {
    const value = this.configForm.get('keys_' + key)?.value || '';
    this.clipboard.copy(value);
  }

}
