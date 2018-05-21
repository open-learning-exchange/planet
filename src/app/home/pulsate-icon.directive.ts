import { Directive, HostBinding, HostListener } from '@angular/core';
import { timer } from 'rxjs/observable/timer';

@Directive({
  selector: '[planetPulsateIcon]'
})
export class PulsateIconDirective {

    constructor() {}

    @HostBinding('class.pulsate') isPulsating = false;

    // On click, set class to pulsate for one second
    // pulsate class triggers a one second animation (which will repeat if not removed)
    @HostListener('click') onClick() {
      this.isPulsating = true;
      const sub = timer(1000).subscribe(() => {
        this.isPulsating = false;
        sub.unsubscribe();
      });
    }

}
