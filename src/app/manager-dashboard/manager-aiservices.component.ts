import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CouchService } from '../shared/couchdb.service';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './manager-aiservices.component.html',
  styleUrls: ['./manager-aiservices.component.scss'],
})
export class ManagerAIServicesComponent implements OnInit {
  configuration: any = {};
  configForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private couchService: CouchService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    const configurationId = this.stateService.configuration._id;
    this.couchService.get('configurations/' + configurationId).subscribe(
      (data: any) => {
        this.configuration = data;
        this.initForm();
      },
      (error) => {
        console.log(error);
      }
    );
  }

  initForm() {
    this.configForm = this.fb.group({
      ...this.mapConfigToFormGroup(this.configuration.keys, 'keys_'),
      ...this.mapConfigToFormGroup(this.configuration.models, 'models_'),
      assistantName: [this.configuration.assistant?.name || ''],
      assistantInstructions: [this.configuration.assistant?.instructions || '']
    });
  }

  mapConfigToFormGroup(configObject: any, prefix: string) {
    console.log(configObject);

    const formGroupObj = {};
    if (configObject) {
      for (const key of Object.keys(configObject)) {
        formGroupObj[prefix + key] = [configObject[key] || ''];
      }
    }
    return formGroupObj;
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  saveConfig() {
    const updatedConfig = {
      ...this.configuration,
      keys: this.extractFormValues(this.configuration.keys, 'keys_'),
      models: this.extractFormValues(this.configuration.models, 'models_'),
      assistant: {
        name: this.configForm.value.assistantName,
        instructions: this.configForm.value.assistantInstructions,
      },
    };
    // Call service to update the config in CouchDB or API
    // this.couchService.update('configurations/' + this.stateService.configuration._id, updatedConfig).subscribe(
    //   (response) => {
    //     console.log('Configuration saved successfully', response);
    //   },
    //   (error) => {
    //     console.log('Error saving configuration', error);
    //   }
    // );
  }

  extractFormValues(configObject: any, prefix: string) {
    const values = {};
    for (const key of Object.keys(configObject)) {
      values[key] = this.configForm.value[prefix + key];
    }
    return values;
  }
}
