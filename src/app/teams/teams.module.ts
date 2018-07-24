import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';
import { CommonModule } from '@angular/common';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';

@NgModule({
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent
  ]
})
export class TeamsModule {}
