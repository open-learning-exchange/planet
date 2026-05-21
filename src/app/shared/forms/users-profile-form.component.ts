import { Component, Input } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';
import { MatFormField, MatLabel, MatError, MatHint, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatDatepickerInput, MatDatepickerToggle, MatDatepicker } from '@angular/material/datepicker';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatRadioGroup, MatRadioButton } from '@angular/material/radio';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { languages } from '../languages';
import { educationLevel } from '../../users/user-constants';
import { StateService } from '../state.service';
import { UserService } from '../user.service';
import { FormErrorMessagesComponent } from './form-error-messages.component';
import { UsersProfileFormGroup } from './users-profile-form.helpers';

@Component({
  selector: 'planet-users-profile-form',
  templateUrl: './users-profile-form.component.html',
  styleUrls: [ './users-profile-form.component.scss' ],
  imports: [
    NgIf, NgFor, FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatError,  MatIcon,
    FormErrorMessagesComponent, MatDatepickerInput, MatDatepickerToggle, MatSuffix, MatDatepicker,
    MatSelect, MatOption, MatRadioGroup, MatRadioButton, MatSlideToggle, MatTooltip, MatHint, MatButton
  ]
})
export class UsersProfileFormComponent {
  @Input({ required: true }) form: FormGroup<UsersProfileFormGroup>;
  @Input() submissionMode = false;
  @Input() allowAdditionalFields = true;

  readonly languages = languages;
  readonly educationLevel = educationLevel;
  showAdditionalFields = false;
  readonly planetConfiguration = this.stateService.configuration;
  readonly minBirthDate = this.userService.minBirthDate;

  constructor(
    private stateService: StateService,
    private userService: UserService
  ) {}
}
