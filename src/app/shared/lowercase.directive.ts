import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

// For use on input elements within Reactive forms to force text lowercase
@Directive({
  selector: '[planetLowercase]'
})
export class LowercaseDirective {

  constructor(private controlRef: NgControl) {}

  @HostListener('input', [ '$event' ]) onInput($event) {
    this.controlRef.control.setValue($event.target.value.toLowerCase());
  }
}
