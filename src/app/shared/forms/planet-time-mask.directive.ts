import { Directive, OnInit } from '@angular/core';
import { NgControl } from '@angular/forms';
import { startWith, pairwise } from 'rxjs/operators';

@Directive({
  selector: 'input[planetTimeMask]'
})
export class PlanetTimeMaskDirective implements OnInit {

  constructor(private controlRef: NgControl) {}

  ngOnInit() {
    this.controlRef.control.valueChanges.pipe(startWith(null), pairwise()).subscribe(([ prevTime, nextTime ]: [ string, string ]) => {
      if (prevTime === nextTime) {
        return;
      }
      const inputTime = nextTime.replace(/[^0-9]*/g, '');
      const regexp = new RegExp('^([0-9]|0[0-9]|1[0-9]|2[0-3])([0-5]|[0-5][0-9])?$');
      if (inputTime !== '' && !regexp.test(inputTime)) {
        this.controlRef.control.setValue(prevTime);
        return;
      }
      this.controlRef.control.setValue(inputTime.length > 2 ?
        inputTime.substring(0, inputTime.length - 2) + ':' + inputTime.substring(inputTime.length - 2, inputTime.length) :
        inputTime
      );
    });
  }

}
