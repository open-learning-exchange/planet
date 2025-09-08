import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './manager-currency.component.html',
  styleUrls: [ './manager-currency.component.scss' ]
})
export class ManagerCurrencyComponent implements OnInit {
  form: UntypedFormGroup;
  configuration: any = {};
  spinnerOn = false;

  constructor(
    private fb: UntypedFormBuilder,
    private configurationService: ConfigurationService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private router: Router
  ) {
    this.form = this.fb.group({
      code: [ '', [ Validators.required, Validators.maxLength(6) ] ],
      symbol: [ '', [ Validators.required, Validators.maxLength(5) ] ]
    });
  }

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    if (this.configuration?.currency) {
      this.form.patchValue(this.configuration.currency);
    }
  }

  save() {
    if (this.form.invalid) { return; }
    this.spinnerOn = true;
    const updatedConfig = { ...this.configuration, currency: { ...this.form.value } };
    this.configurationService.updateConfiguration(updatedConfig)
      .pipe(finalize(() => this.spinnerOn = false))
      .subscribe(
        () => this.stateService.requestData('configurations', 'local'),
        () => this.planetMessageService.showAlert($localize`There was an error updating the configuration`),
        () => {
          this.router.navigate([ '/manager' ]);
          this.planetMessageService.showMessage($localize`Currency Updated Successfully`);
        }
      );
  }
}
