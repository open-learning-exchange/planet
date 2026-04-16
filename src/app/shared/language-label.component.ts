import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'planet-language-label',
  template: `
    {{ displayText }}<ng-content></ng-content>
  `
})
export class LanguageLabelComponent implements OnChanges {

  @Input() options = [];
  @Input() label = '';
  displayText = '';

  ngOnChanges() {
    this.displayText = this.options.find(opt => opt.value === this.label)?.label;
  }
}
