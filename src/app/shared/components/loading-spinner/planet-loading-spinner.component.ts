import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-loading-spinner',
  templateUrl: './planet-loading-spinner.component.html',
  styleUrls: ['./planet-loading-spinner.component.scss']
})
export class PlanetLoadingSpinnerComponent {
  @Input() text = $localize `Loading`;
}
