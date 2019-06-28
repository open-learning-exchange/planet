import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { NewsModule } from '../news/news.module';
import { DialogsAddResourcesModule } from '../shared/dialogs/dialogs-add-resources.module';

@NgModule({
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule,
    PlanetDialogsModule,
    NewsModule,
    DialogsAddResourcesModule
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent
  ]
})
export class TeamsModule {}
