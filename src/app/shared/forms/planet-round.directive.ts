import { Directive, Input, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetRound]'
})
export class PlanetRoundDirective {

  @Input('planetRound') precision;

  constructor(
    private ngControl: NgControl
  ) {}

  @HostListener('focusout') onFocusOut() {
    if (typeof this.ngControl.value !== 'number' || this.ngControl.value === 0 ) {
      return;
    }
    const precision = this.precision || 0;
    const rounded = Math.round(+((this.ngControl.value + Number.EPSILON) + `e${precision}`)) + `e${-precision}`;
    this.ngControl.control.setValue(+rounded);
  }

}
