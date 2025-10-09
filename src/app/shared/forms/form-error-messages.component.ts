/**
 * Centralized component for all form error messages
 * MUST BE WRAPPED IN A mat-error ELEMENT
 * Takes a form control as input and outputs a span element with the error message
 * NOTE: Pattern validator is only used for username as of v0.1.13
 * Message will need update if used for other situations
 */

import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, AbstractControlDirective } from '@angular/forms';

@Component({
  selector: 'planet-form-error-messages',
  template: `
    <span *ngIf="error" [matTooltip]="tooltipText()" i18n>{error, select,
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
      invalidTeamTypeTransition {Team type can only be changed for teams created on this planet}
    }</span>{{number === undefined ? '' : ' ' + number}}
    <ng-container *ngIf="error === 'matDatepickerMin' || error === 'matDatepickerMax'">
      {{date === undefined ? '' : ' ' + (date | date)}}
    </ng-container>
  `
})
export class FormErrorMessagesComponent implements OnInit {

  @Input() private control: AbstractControlDirective | AbstractControl;

  error = '';
  number: number;
  date: Date;

  ngOnInit() {
    this.control.statusChanges.subscribe(() => {
      this.updateError();
    });
  }

  shouldShowError(): boolean {
    return (
      this.control &&
      this.control.errors &&
      (this.control.dirty || this.control.touched)
    );
  }

  // Show one error at a time
  updateError() {
    if (!this.control.errors) {
      this.error = '';
      return;
    }
    const errorType = Object.keys(this.control.errors)[0];
    const number = this.control.errors[errorType].min !== undefined || this.control.errors[errorType].max !== undefined ?
      this.control.errors[errorType].min || this.control.errors[errorType].max || 0 :
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
