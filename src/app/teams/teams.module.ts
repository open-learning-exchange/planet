import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

@NgModule({
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule,
    SharedComponentsModule
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent
  ]
})
export class TeamsModule {}
