import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';
import { stringify } from 'querystring';

@Directive({
  selector: 'input[planetTimeMask]'
})
export class TimeMaskDirective {
  previousTime = '';

  constructor(private controlRef: NgControl) { }

  @HostListener('input', [ '$event' ]) onInput($event) {
    this.controlRef.control.setValue(this.getOutputTime($event.target.value));
  }

  getOutputTime(inputTime: string): string {
    inputTime = inputTime.replace(/[^0-9]*/g, '');
    const regexp = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3])([0-5]|[0-5][0-9])?$');
    if (inputTime !== '' && !regexp.test(inputTime)) {
      return this.previousTime;
    }
    switch (inputTime.length) {
      case 4: {
        this.previousTime = inputTime.substring(0, 2) + ':' + inputTime.substring(2, 4);
        break;
      }
      case 3: {
        if (+inputTime.substring(1, 3) > 59) {
          this.previousTime = inputTime.substring(0, 2) + ':' + inputTime.substring(2, 3);
        } else {
          this.previousTime = inputTime.substring(0, 1) + ':' + inputTime.substring(1, 3);
        }
        break;
      }
      case 2: {
        if (+inputTime.substring(1, 2) > 5) {
          this.previousTime = inputTime;
        } else {
          this.previousTime = inputTime.substring(0, 1) + ':' + inputTime.substring(1, 2);
        }
        break;
      }
      default: this.previousTime = inputTime;
    }
    return this.previousTime;
  }
}
