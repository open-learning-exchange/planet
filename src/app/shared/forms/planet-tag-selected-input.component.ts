import { Component, Input } from '@angular/core';

@Component({
  template: `
    <span [ngSwitch]="tags.length" class="small margin-lr-5" *ngIf="helperText">
      <span *ngSwitchCase="0" i18n>No collections selected</span>
      <span *ngSwitchCase="1"><span i18n>Selected:</span>{{' ' + tooltipLabels}}</span>
      <span *ngSwitchDefault [matTooltip]="tooltipLabels">Hover to see selected collections</span>
    </span>
  `,
  selector: 'planet-tag-selected-input'
})
export class PlanetTagSelectedInputComponent {

  @Input() tooltipLabels = '';
  @Input() tags: string[] = [];
  @Input() helperText = true;

}
