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
import { UsersProfileFormGroup } from './users-profile-form';

@Component({
  selector: 'planet-users-profile-form',
  template: `
    <div [formGroup]="form" class="form-space">
      <ng-container *ngIf="!submissionMode || (submissionMode && showAdditionalFields)">
        <div class="profile-names">
          <mat-form-field>
            <mat-label i18n>First Name</mat-label>
            <input matInput formControlName="firstName" [required]="!submissionMode">
            <mat-error>
              <planet-form-error-messages [control]="form.controls.firstName"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label i18n>Middle Name</mat-label>
            <input matInput formControlName="middleName">
          </mat-form-field>
          <mat-form-field>
            <mat-label i18n>Last Name</mat-label>
            <input matInput formControlName="lastName" [required]="!submissionMode">
            <mat-error>
              <planet-form-error-messages [control]="form.controls.lastName"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
        </div>
        <div class="profile-contacts">
          <mat-form-field>
            <mat-label i18n>Email</mat-label>
            <input matInput formControlName="email" [required]="!submissionMode">
            <mat-error>
              <planet-form-error-messages [control]="form.controls.email"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label i18n>Phone Number</mat-label>
            <input matInput formControlName="phoneNumber" [required]="!submissionMode">
            <mat-error>
              <planet-form-error-messages [control]="form.controls.phoneNumber"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label i18n>Birthdate</mat-label>
            <input matInput [matDatepicker]="dp" formControlName="birthDate" [required]="!submissionMode" [min]="minBirthDate">
            <mat-datepicker-toggle matIconSuffix [for]="dp"></mat-datepicker-toggle>
            <mat-datepicker #dp></mat-datepicker>
            <mat-error>
              <planet-form-error-messages [control]="form.controls.birthDate"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
        </div>
        <div class="profile-dropdowns">
          <mat-form-field>
            <mat-label i18n>Language</mat-label>
            <mat-select formControlName="language" [required]="!submissionMode">
              <mat-option *ngFor="let language of languages" [value]="language.name">
                {{language.name}}
              </mat-option>
            </mat-select>
            <mat-error>
              <planet-form-error-messages [control]="form.controls.language"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
          <mat-form-field>
            <mat-label i18n>level</mat-label>
            <mat-select formControlName="level" [required]="!submissionMode">
              <mat-option *ngFor="let level of educationLevel" [value]="level.value">{{level.label}}</mat-option>
            </mat-select>
            <mat-error>
              <planet-form-error-messages [control]="form.controls.level"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
        </div>
      </ng-container>
      <mat-radio-group class="radio-group full-width" formControlName="gender" [required]="!submissionMode">
        <label i18n>Gender</label>
        <mat-radio-button class="planet-radio-button" value="male">
          <div class="radio-icon-label">
            <mat-icon svgIcon="male" class="male-icon primary-text-color margin-lr-3"></mat-icon><span i18n>Male</span>
          </div>
        </mat-radio-button>
        <mat-radio-button class="planet-radio-button" value="female">
          <div class="radio-icon-label">
            <mat-icon svgIcon="female" class="female-icon accent-text-color margin-lr-3"></mat-icon><span i18n>Female</span>
          </div>
        </mat-radio-button>
        <mat-error i18n *ngIf="form.controls.gender.invalid && form.controls.gender.touched">
          This field is required
        </mat-error>
        <mat-slide-toggle *ngIf="!submissionMode && planetConfiguration.betaEnabled==='user'"
          formControlName="betaEnabled" i18n i18n-matTooltip
          matTooltip="Beta features may not work as intended. It's recommended to leave this off">
          Enable Beta features
        </mat-slide-toggle>
      </mat-radio-group>
      <ng-container *ngIf="submissionMode">
        <ng-container *ngIf="!showAdditionalFields">
          <mat-form-field>
            <mat-label i18n>Birth Year</mat-label>
            <input matInput type="number" formControlName="birthYear" [required]="false">
            <mat-hint i18n>Enter year (e.g., 1995)</mat-hint>
            <mat-error>
              <planet-form-error-messages [control]="form.controls.birthYear"></planet-form-error-messages>
            </mat-error>
          </mat-form-field>
        </ng-container>
        <button *ngIf="allowAdditionalFields" mat-button type="button" (click)="showAdditionalFields = !showAdditionalFields">
          <span>{{ showAdditionalFields ? 'Hide Additional Fields' : 'Show Additional Fields' }}</span>
        </button>
      </ng-container>
    </div>
  `,
  styles: [`
    .form-space {
      display: grid;
      grid-template-areas:
        'form-names'
        'form-contacts'
        'form-dropdowns'
        'radio-group';
      gap: 1rem;
      justify-content: center;
    }

    .profile-names {
      grid-area: form-names;
    }

    .profile-contacts {
      grid-area: form-contacts;
    }

    .profile-dropdowns {
      grid-area: form-dropdowns;
    }

    .profile-names mat-form-field,
    .profile-contacts mat-form-field,
    .profile-dropdowns mat-form-field {
      margin-right: 1rem;
    }

    .radio-group {
      grid-area: radio-group;
    }
  `],
  imports: [
    NgIf,
    NgFor,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    FormErrorMessagesComponent,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatSuffix,
    MatDatepicker,
    MatSelect,
    MatOption,
    MatRadioGroup,
    MatRadioButton,
    MatSlideToggle,
    MatTooltip,
    MatHint,
    MatButton,
    MatIcon
  ]
})
export class UsersProfileFormComponent {
  @Input({ required: true }) form: FormGroup<UsersProfileFormGroup>;
  @Input() submissionMode = false;
  @Input() allowAdditionalFields = true;

  languages = languages;
  educationLevel = educationLevel;
  showAdditionalFields = false;
  planetConfiguration = this.stateService.configuration;
  minBirthDate: Date = this.userService.minBirthDate;

  constructor(
    private stateService: StateService,
    private userService: UserService
  ) {}

}
