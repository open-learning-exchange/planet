import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-loading-spinner',
  template: `
      <div class="planet-spinner-container">
      <mat-spinner diameter="40"></mat-spinner>
      <div class="planet-spinner-text">{{ text }}</div>
    </div>
  `,
  styles: [`
    :host {
      align-items: center;
      display: flex;
      justify-content: center;

      .planet-spinner-container {
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 24px;
      }
    }
  `]
})
export class PlanetLoadingSpinnerComponent {
  @Input() text = $localize `Loading`;
}
