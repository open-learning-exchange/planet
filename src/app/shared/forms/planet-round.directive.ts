import { Directive, Input, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetRound]'
})
export class PlanetRoundDirective {

  @Input('planetRound') precision = 0;

  constructor(
    private ngControl: NgControl
  ) {}

  @HostListener('focusout') onFocusOut() {
    if (typeof this.ngControl.value !== 'number') {
      return;
    }
    this.ngControl.control.setValue(this.ngControl.value.toFixed(this.precision));
  }

}
