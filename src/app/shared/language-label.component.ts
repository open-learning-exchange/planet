import { Component, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'language-label',
  template: `
    {{ displayText }}<ng-content></ng-content>
  `
})
export class LanguageLabelComponent implements OnChanges {

  @Input() options = [];
  @Input() label: string = '';
  displayText: string = '';
  
  ngOnChanges() {
    this.displayText = this.options.find(opt => opt.value === this.label)?.label;
  }
}
