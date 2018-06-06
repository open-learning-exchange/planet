import { NgModule } from '@angular/core';
import { TeamRouterModule } from './team-router.module';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../shared/material.module';
import { TeamComponent } from './team.component';

@NgModule({
  imports: [
    TeamRouterModule,
    CommonModule,
    MaterialModule
  ],
  declarations: [
    TeamComponent
  ]
})
export class TeamModule {}
