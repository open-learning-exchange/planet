import { Component, Input } from '@angular/core';
import { AbstractControl, AbstractControlDirective } from '@angular/forms';

@Component({
  selector: 'app-form-error-messages',
  template: `
    <ul class="text-danger" *ngIf="shouldShowErrors()">
      <li *ngFor="let error of listOfErrors()">{{error}}</li>
    </ul>
  `,
  styles: []
})
export class FormErrorMessagesComponent {
  private static readonly errorMessages = {
    required: field => 'This is required',
    memberLimit: params => params.message
  };
  @Input() private control: AbstractControlDirective | AbstractControl;

  shouldShowErrors(): boolean {
    return (
      this.control &&
      this.control.errors &&
      (this.control.dirty || this.control.touched)
    );
  }

  listOfErrors(): string[] {
    return Object.keys(this.control.errors).map(field =>
      this.getMessage(field, this.control.errors[field])
    );
  }

  private getMessage(type: string, params: any) {
    return FormErrorMessagesComponent.errorMessages[type](params);
  }
}
