import { Directive, HostBinding, HostListener } from '@angular/core';
import { timer } from 'rxjs/observable/timer';

@Directive({
  selector: '[planetPulsateIcon]'
})
export class PulsateIconDirective {

    constructor() {}

    @HostBinding('class.pulsate') isPulsating = false;

    // Set which class is to pulsate (bf becoming .active) and save it as state var
    @HostListener('click') onClick() {
      this.isPulsating = true;
      const sub = timer(1000, 1000).subscribe(() => {
        this.isPulsating = false;
        sub.unsubscribe();
      });
    }

}
