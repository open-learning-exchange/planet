import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { DashboardTileComponent, DashboardTileTitleComponent } from './dashboard-tile.component';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { CoursesViewDetailModule } from '../courses/view-courses/courses-view-detail.module';

@NgModule({
  imports: [
    DashboardRoutingModule,
    CommonModule,
    RouterModule,
    MaterialModule,
    SharedComponentsModule,
    PlanetDialogsModule,
    CoursesViewDetailModule,
  ],
  declarations: [
    DashboardComponent,
    DashboardTileComponent,
    DashboardTileTitleComponent,
  ]
})
export class DashboardModule {}
