import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfigurationService } from '../configuration/configuration.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormErrorMessagesComponent } from '../shared/forms/form-error-messages.component';
import { SubmitDirective } from '../shared/submit.directive';

@Component({
  templateUrl: './manager-currency.component.html',
  styleUrls: ['./manager-settings.shared.scss'],
  imports: [
    MatToolbar, MatIconButton, RouterLink, MatIcon, FormsModule, ReactiveFormsModule, MatCard, MatCardHeader, MatCardTitle,
    MatCardContent, MatList, MatListItem, MatListItemTitle, MatFormField, MatLabel, MatInput, MatError, FormErrorMessagesComponent,
    MatButton, SubmitDirective
  ]
})
export class ManagerCurrencyComponent implements OnInit {
  form: FormGroup<{ code: FormControl<string>, symbol: FormControl<string>, key: FormControl<string> }>;
  configuration: any = {};
  spinnerOn = true;

  constructor(
    private fb: NonNullableFormBuilder,
    private configurationService: ConfigurationService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private router: Router
  ) {
    this.form = this.fb.group({
      code: this.fb.control('', { validators: [ Validators.required, Validators.maxLength(6) ] }),
      symbol: this.fb.control('', { validators: [ Validators.required, Validators.maxLength(5) ] }),
      key: this.fb.control('', { validators: [] })
    });
  }

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    this.configuration.keys = { currency: this.stateService.keys.currency };
    if (this.configuration?.currency) {
      this.form.patchValue(this.configuration.currency);
    }
    if (this.configuration?.keys?.currency) {
      this.form.patchValue({ key: this.configuration.keys.currency });
    }
  }

  save() {
    const spinnerOff = () => this.spinnerOn = false;
    if (this.form.invalid) {
      spinnerOff();
      return;
    }
    this.spinnerOn = true;
    const { key, ...codeAndSymbol } = this.form.value;
    this.configurationService.patchLocalConfiguration({ currency: { ...codeAndSymbol }, keys: { currency: key } })
      .pipe(finalize(spinnerOff))
      .subscribe(
        () => {
          this.stateService.requestData('configurations', 'local');
        },
        (err) => {
          this.planetMessageService.showAlert($localize`There was an error updating the configuration`);
        },
        () => {
          this.router.navigate(['/manager']);
          this.planetMessageService.showMessage($localize`Currency Updated Successfully`);
        }
      );
  }
}
