import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-label',
  template: `
    <span i18n>{label, select,
      temperature {Temperature}
      pulse {Pulse}
      bp {Blood Pressure}
      height {Height}
      weight {Weight}
      vision {Vision}
      hearing {Hearing}
      help {Help Wanted}
      offer {Offer}
      advice {Request for Advice}
    }</span>
  `
})
export class LabelComponent {

  @Input() label: string;

}
