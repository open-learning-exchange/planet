import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[planetRestrictDiacritics]',
  standalone: false
})
export class RestrictDiacriticsDirective {

  constructor(private controlRef: NgControl) {}

  @HostListener('input', [ '$event' ]) onInput($event) {
    const sanitizedValue = this.restrictDiacritics($event.target.value);
    this.controlRef.control.setValue(sanitizedValue);
  }

  restrictDiacritics(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f\u00DF]/g, '');
  }
}
