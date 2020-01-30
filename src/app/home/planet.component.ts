import { Component } from '@angular/core';
import { StateService } from '../shared/state.service';


@Component({
  templateUrl: './planet.component.html',
})
export class PlanetComponent {

  planetType: string = this.stateService.configuration.planetType;

  constructor(
    private stateService: StateService
  ) {}

}
