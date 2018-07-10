import { NgModule } from '@angular/core';
import { TeamsRouterModule } from './teams-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';

@NgModule({
  imports: [
    TeamsRouterModule,
    CommonModule,
    MaterialModule
  ],
  declarations: [
    TeamsComponent,
    TeamsViewComponent
  ]
})
export class TeamsModule {}
