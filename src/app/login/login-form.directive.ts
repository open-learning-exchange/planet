import { Directive, ElementRef } from '@angular/core';

@Directive({
    selector: '[lowercase]'
})
export class LowerCase {
  constructor(public el: ElementRef) {
    this.el.nativeElement.onkeypress = (evt) => {
      (evt.which < 65 || evt.which > 90) ? "" : evt.preventDefault();
    };
  }
}
