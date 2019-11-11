import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: 'input[planetTimeMask]'
})
export class TimeMaskDirective {

  constructor(private _el: ElementRef) { }

  @HostListener('input', [ '$event' ]) onInputChange(event) {
    const inputValue = this._el.nativeElement.value;
    console.log(inputValue);
    const intValue = inputValue.replace(/[^0-9]*/g, '');
    let hour = intValue.substring(0, 2);
    let minute = intValue.substring(2, 4);
    if (hour.length < 2 && +hour > 2) {hour = ''; }
    if (+hour > 23) {hour = hour.substring(0, 1); }
    if (minute.length < 2 && +minute > 5) {minute = ''; }
    if (+minute > 59) {minute = minute.substring(0, 1); }
    if (minute.length > 0) {
      this._el.nativeElement.value = hour + ':' + minute;
    } else {
      this._el.nativeElement.value = hour + minute;
    }
    if ( inputValue !== this._el.nativeElement.value) {
      event.stopPropagation();
    }
  }
}
