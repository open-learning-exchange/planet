import { Directive, Host, ElementRef, AfterViewInit } from '@angular/core';
import { FormControlName, FormControl, Validators } from '@angular/forms';

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: 'input[type="number"]'
})
export class PlanetNumberValidatorDirective implements AfterViewInit {

  constructor(@Host() private controlName: FormControlName, @Host() private elementRef: ElementRef) { }

  ngAfterViewInit() {

    const control: FormControl = this.controlName.control;
    const numberValidator = () => !this.elementRef.nativeElement.validity.valid ? { 'invalidInt': true } : null;
    const existingValidator = control.validator;

    control.setValidators(existingValidator ? Validators.compose([ existingValidator, numberValidator ]) : numberValidator);
    setTimeout(() => control.updateValueAndValidity(), 0);

  }
}
