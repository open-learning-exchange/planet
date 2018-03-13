import { Directive, Input, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[lowercase]'
})
export class LowerCase {
  @Input() lowercase: string;
  @HostBinding('value') value = '';

  constructor() {}

  @HostListener('keyup') onMouseEnter() {
    this.value = this.lowercase.toLowerCase();
  }
}