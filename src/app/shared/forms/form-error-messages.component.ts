/**
 * Centralized component for all form error messages
 * MUST BE WRAPPED IN A mat-error ELEMENT
 * Takes a form control as input and outputs a span element with the error message
 * NOTE: Pattern validator is only used for username as of v0.1.13
 * Message will need update if used for other situations
 */

import { Component, Input, OnDestroy, Optional } from '@angular/core';
import { AbstractControl, AbstractControlDirective, FormGroupDirective, NgForm } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

@Component({
  selector: 'planet-form-error-messages',
  template: `
    @if (error && shouldShowError()) {
      <span [matTooltip]="tooltipText()" i18n>{error, select,
      required {This field is required}
      min {The number cannot be below}
      max {The number cannot exceed}
      matDatepickerMin {The date cannot be before}
      matDatepickerMax {The date cannot be after}
      matDatepickerParse {Invalid date}
      duplicate {Value already exists}
      duplicateUser {User already exists}
      email {Please enter a valid email}
      matchPassword {Passwords must match}
      unmatchPassword {Passwords must not match}
      invalidInt {Please enter a number}
      invalidPositive {The number cannot be negative}
      invalidHex {Hex is not valid}
      invalidTime {Time is invalid}
      invalidDateFormat {Date is in incorrect format}
      invalidTimeFormat {Time is in incorrect format}
      invalidDate {Date is invalid}
      invalidEndDate {End date cannot be before start date}
      invalidEndTime {End time cannot be before start time}
      dateInPast {Cannot be before current date}
      invalidPassword {Password is not valid}
      pattern {Invalid input. Hover for more info}
      invalidFirstCharacter {Must start with letter or number}
      invalidFutureDate {Cannot be after current date}
      dateRequired {This field requires a valid date}
      noUnderscore {Cannot include an underscore}
      whitespace {Cannot include space in password}
      bp {Blood Pressure should be systolic/diastolic}
      notFileMatch {File not found in list}
      invalidLink {Invalid link. Must be a valid URL e.g https://ole.org/}
    }</span>{{number === undefined ? '' : ' ' + number}}
      @if (error === 'matDatepickerMin' || error === 'matDatepickerMax') {
        {{date === undefined ? '' : ' ' + (date | date)}}
      }
    }
    `,
  imports: [MatTooltip, DatePipe]
})
export class FormErrorMessagesComponent implements OnDestroy {

  @Input() set control(ctrl: AbstractControlDirective | AbstractControl | undefined) {
    if (this.targetControl === ctrl) {
      return;
    }
    this.statusSubscription?.unsubscribe();
    this.targetControl = ctrl;
    this.updateError();
    if (this.targetControl?.statusChanges) {
      this.statusSubscription = this.targetControl.statusChanges.subscribe(() => {
        this.updateError();
      });
    }
  }
  get control(): AbstractControlDirective | AbstractControl | undefined {
    return this.targetControl;
  }

  private targetControl?: AbstractControlDirective | AbstractControl;
  private statusSubscription?: Subscription;

  error = '';
  number?: number;
  date?: Date;

  constructor(
    @Optional() private parentForm: NgForm | null,
    @Optional() private parentFormGroup: FormGroupDirective | null
  ) {}

  ngOnDestroy() {
    this.statusSubscription?.unsubscribe();
  }

  // Matches the error state Material shows on the surrounding field
  shouldShowError(): boolean {
    const form = this.parentFormGroup || this.parentForm;
    return !!(
      this.targetControl?.errors &&
      (this.targetControl.dirty || this.targetControl.touched || form?.submitted)
    );
  }

  // Show one error at a time
  updateError() {
    this.number = undefined;
    this.date = undefined;
    if (!this.targetControl?.errors) {
      this.error = '';
      return;
    }
    const errorType = Object.keys(this.targetControl.errors)[0];
    const number = this.targetControl.errors[errorType]?.min !== undefined || this.targetControl.errors[errorType]?.max !== undefined ?
      this.targetControl.errors[errorType].min || this.targetControl.errors[errorType].max || 0 :
      undefined;
    if (errorType.indexOf('Datepicker') > -1) {
      this.date = new Date(number);
    } else {
      this.number = number;
    }
    this.error = errorType;
  }

  tooltipText() {
    switch (this.error) {
      case 'pattern':
        return $localize`Letters, numbers and _ . - allowed.`;
      default:
        return '';
    }
  }

}
