import { Directive, Input, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[planetLowercase]'
})
export class LowercaseDirective {
  @Input() lowercase: string;
  @HostBinding('value') value = '';

  constructor() {}

  @HostListener('keyup') onMouseEnter() {
    this.value = this.lowercase.toLowerCase();
  }
}
