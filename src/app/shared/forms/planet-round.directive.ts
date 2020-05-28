import { Directive, Input, HostListener, ElementRef } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetRound]'
})
export class PlanetRoundDirective {

  @Input('planetRound') precision;

  constructor(
    private ngControl: NgControl,
    private elementRef: ElementRef
  ) {}

  @HostListener('focusout') onFocusOut() {
    if (typeof this.ngControl.value !== 'number') {
      return;
    }
    const [ integer, decimals ] = this.elementRef.nativeElement.value.split('.');
    const value = [ integer, (decimals || '0').substring(0, 10) ].join('.');
    const precision = this.precision || 0;
    const rounded = Math.round(+((+value + Number.EPSILON) + `e${precision}`)) + `e${-precision}`;
    this.ngControl.control.setValue(+rounded);
  }

}
