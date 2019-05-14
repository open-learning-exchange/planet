/**
 * Centralized component for all form error messages
 * MUST BE WRAPPED IN A mat-error ELEMENT
 * Takes a form control as input and outputs a span element with the error message
 * NOTE: Pattern validator is only used for username as of v0.1.13
 * Message will need update if used for other situations
 */

import { Component, Input } from '@angular/core';
import { AbstractControl, AbstractControlDirective } from '@angular/forms';

@Component({
  selector: 'planet-form-error-messages',
  template: `
    <span *ngIf="shouldShowError()" [matTooltip]="tooltipText()" i18n>{updateError(), select,
      required {This field is required}
      min {The number cannot be below}
      max {The number cannot exceed}
      duplicate {Value already exists}
      email {Please enter a valid email}
      matchPassword {Passwords must match}
      unmatchPassword {Passwords must not match}
      invalidInt {Please enter a number}
      invalidPositive {The number cannot be negative}
      invalidHex {Hex is not valid}
      invalidTime {Time is invalid}
      invalidDateFormat {Date is in incorrect format}
      invalidDate {Date is invalid}
      invalidEndDate {End date cannot be before start date}
      invalidEndTime {End time cannot be before start time}
      dateInPast {Cannot be before current date}
      invalidPassword {Password is not valid}
      pattern {Invalid input. Hover for more info}
      invalidFirstCharacter {Must start with letter or number}
      invalidFutureDate {Cannot be after current date}
      dateRequired {This field is required as valid date}
      noUnderscore {Cannot include an underscore}
    }</span>{{number === undefined ? '' : ' ' + number}}
  `
})
export class FormErrorMessagesComponent {

  @Input() private control: AbstractControlDirective | AbstractControl;

  error = '';
  number: number;

  shouldShowError(): boolean {
    return (
      this.control &&
      this.control.errors &&
      (this.control.dirty || this.control.touched)
    );
  }

  // Show one error at a time
  updateError(): string {
    const errorType = Object.keys(this.control.errors)[0];
    if (this.control.errors[errorType].min !== undefined || this.control.errors[errorType].max !== undefined) {
      this.number = this.control.errors[errorType].min || this.control.errors[errorType].max || 0;
    }
    return errorType;
  }

  tooltipText() {
    switch (this.updateError()) {
      case 'pattern':
        return 'Letters, numbers and _ . - allowed.';
      default:
        return '';
    }
  }

}
