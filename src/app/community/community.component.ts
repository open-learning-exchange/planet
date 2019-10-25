import { Component } from '@angular/core';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './community.component.html'
})
export class CommunityComponent {

  configuration = this.stateService.configuration;
  teamId = `${this.stateService.configuration.code}@${this.stateService.configuration.parentCode}`;

  constructor(
    private stateService: StateService
  ) {}

}
