import { Directive, Input, HostListener, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetRound]'
})
export class PlanetRoundDirective {

  // Maximum precision value is 9. Values are truncated before rounding to avoid incorrect values.
  @Input('planetRound') precision;

  constructor(
    private ngControl: NgControl,
    private elementRef: ElementRef
  ) {}

  @HostListener('focusout') onFocusOut() {
    if (typeof this.ngControl.value !== 'number' || this.ngControl.value === 0 ) {
      return;
    }
    if (this.precision > 9) {
      console.error('planetRound has a maximum precision of 9. Numbers will not round correctly if precision set above 9');
      return;
    }
    const [ integer, decimals ] = this.elementRef.nativeElement.value.split('.');
    const value = [ integer, (decimals || '0').substring(0, 10) ].join('.');
    const precision = this.precision || 0;
    const rounded = Math.round(+((+value + Number.EPSILON) * Math.pow(10, precision))) / Math.pow(10, precision);
    this.ngControl.control.setValue(+rounded);
  }

}
