import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { CustomValidators } from '../validators/custom-validators';

@Component({
  templateUrl: './manager-social.component.html',
  styleUrls: [ './manager.scss' ]
})
export class ManagerSocialComponent implements OnInit {
  configuration: any = {};
  socialForm: FormGroup = this.fb.group({});
  spinnerOn = true;
  private unsubscribe$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private couchService: CouchService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private configurationService: ConfigurationService,
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
    const controls = {};
    for (const key of Object.keys(this.configuration.social)) {
      controls[key] = [this.configuration.social[key] || '', [CustomValidators.validLink]];
    }
    this.socialForm = this.fb.group(controls);
  }

  saveConfig() {
    if (this.socialForm.invalid) {
      this.spinnerOn = false;
      return;
    }
    this.spinnerOn = true;
    const updatedConfig = {
      ...this.configuration,
      social: this.socialForm.value
    };
    this.configurationService.updateConfiguration(updatedConfig)
      .pipe(
        finalize(() => this.spinnerOn = false),
        takeUntil(this.unsubscribe$)
      )
      .subscribe(
        () => {
          this.stateService.requestData('configurations', 'local');
          this.router.navigate(['/manager']);
          this.planetMessageService.showMessage('Configuration Updated Successfully');
        },
        err => {
          this.planetMessageService.showAlert('There was an error updating the configuration');
        }
      );
  }

}
