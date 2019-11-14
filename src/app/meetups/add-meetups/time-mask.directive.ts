import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetTimeMask]'
})
export class TimeMaskDirective {

  constructor(private _el: ElementRef) { }

  @HostListener('input', [ '$event' ]) onInputChange(event) {
    const inputValue = this._el.nativeElement.value;
    let intValue = inputValue.replace(/[^0-9]*/g, '');
    const regexp = new RegExp('^[0-2]$|^(0[0-9]|1[0-9]|2[0-3])([0-5]|[0-5][0-9])?$');
    if (!regexp.test(intValue)) {
      intValue = intValue.substring(0, intValue.length - 1);
    }
    if (intValue.length > 2) {
      intValue = intValue.substring(0, 2) + ':' + intValue.substring(2, 4);
    }
    this._el.nativeElement.value = intValue;
    if ( inputValue !== this._el.nativeElement.value) {
      event.stopPropagation();
    }
  }
}
