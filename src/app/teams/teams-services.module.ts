import { NgModule } from '@angular/core';
import { TeamsModule } from './teams.module';

import { TeamsServicesRoutingModule } from './teams-services-routing.module';

@NgModule({
  imports: [
    TeamsServicesRoutingModule,
    TeamsModule,
  ]
})
export class TeamsServicesModule {}
