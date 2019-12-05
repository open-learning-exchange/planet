import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-health-label',
  template: `
    <span i18n>{label, select,
      temperature {Temperature}
      pulse {Pulse}
      bp {Blood Pressure}
      height {Height}
      weight {Weight}
      vision {Vision}
      hearing {Hearing}
    }</span>
  `
})
export class HealthLabelComponent {

  @Input() label: string;

}
