import { Directive, Host, ElementRef, AfterViewInit } from '@angular/core';
import { AbstractControl, FormControl, FormControlName, ValidatorFn } from '@angular/forms';

@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector
  selector: 'input[type="number"]'
})
export class PlanetNumberValidatorDirective implements AfterViewInit {

  constructor(@Host() private controlName: FormControlName, @Host() private elementRef: ElementRef) { }

  ngAfterViewInit() {

    const control = this.controlName.control as FormControl<number | null>;
    const numberValidator: ValidatorFn = (_control: AbstractControl<number | null>) =>
      !this.elementRef.nativeElement.validity.valid ? { 'invalidInt': true } : null;

    control.addValidators(numberValidator);
    setTimeout(() => control.updateValueAndValidity(), 0);

  }
}
