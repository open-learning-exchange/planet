import { Component, Input } from '@angular/core';
import { AbstractControl, AbstractControlDirective } from '@angular/forms';

@Component({
  selector: 'planet-form-error-messages',
  template: `
    <ul class="text-danger" *ngIf="shouldShowErrors()">
      <li *ngFor="let error of listOfErrors()">{{error}}</li>
    </ul>
  `,
  styles: [
    `ul {
      list-style-type: none;
      font-size: .8rem;
      padding-left: .2em;
    }`
  ]
})
export class FormErrorMessagesComponent {
  private static readonly errorMessages = {
    // even though they have the same return type, different names are used since it's more clear & easier to understand/debug
    required: () => 'This field is required',
    min: params => 'The number cannot be below ' + params.min,
    duplicateCourse: params => params.message,
    invalidInt: params => params.message,
    invalidHex: params => params.message,
    invalidTime: params => params.message,
    invalidDateFormat: params => params.message,
    invalidDate: params => params.message,
    invalidEndDate: params => params.message,
    inavlidEndTime: params => params.message
  };
  @Input() private control: AbstractControlDirective | AbstractControl;

  shouldShowErrors(): boolean {
    return (
      this.control &&
      this.control.errors &&
      (this.control.dirty || this.control.touched)
    );
  }

  // loops through the keys of the error objectt
  listOfErrors(): string[] {
    return Object.keys(this.control.errors).map(field =>
      this.getMessage(field, this.control.errors[field])
    );
  }

  // calls the statuc method errorMessages
  private getMessage(type: string, params: any) {
    return FormErrorMessagesComponent.errorMessages[type](params);
  }
}
