import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent } from '@angular/material/card';
import { MatList, MatListItem, MatListItemTitle } from '@angular/material/list';
import { MatFormField, MatLabel, MatError } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { StateService } from '@shared/state.service';
import { FormErrorMessagesComponent } from '@shared/forms/form-error-messages.component';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';

import { ConfigurationService } from '../../configuration/configuration.service';
import { ManagerKeysComponent } from './manager-keys.component';

@Component({
  templateUrl: './manager-currency.component.html',
  styleUrls: ['./manager-settings.shared.scss'],
  imports: [
    MatToolbar, MatIconButton, RouterLink, MatIcon, FormsModule, ReactiveFormsModule, MatCard, MatCardHeader, MatCardTitle,
    MatCardContent, MatList, MatListItem, MatListItemTitle, MatFormField, MatLabel, MatInput, MatError, FormErrorMessagesComponent,
    MatButton, ManagerKeysComponent
  ]
})
export class ManagerCurrencyComponent implements OnInit {
  @ViewChild(ManagerKeysComponent) keysCard: ManagerKeysComponent;
  form: FormGroup<{ code: FormControl<string>, symbol: FormControl<string> }>;
  configuration: any = {};

  constructor(
    private fb: NonNullableFormBuilder,
    private configurationService: ConfigurationService,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.form = this.fb.group({
      code: this.fb.control('', { validators: [ Validators.required, Validators.maxLength(6) ] }),
      symbol: this.fb.control('', { validators: [ Validators.required, Validators.maxLength(5) ] })
    });
  }

  ngOnInit() {
    this.configuration = this.stateService.configuration;
    if (this.configuration?.currency) {
      this.form.patchValue(this.configuration.currency);
    }
  }

  save() {
    if (this.form.invalid) {
      return;
    }
    this.dialogsLoadingService.start();
    this.keysCard.saveTypedKeys().pipe(
      switchMap(() => this.configurationService.patchLocalConfiguration({ currency: { ...this.form.value } })),
      finalize(() => this.dialogsLoadingService.stop())
    )
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
