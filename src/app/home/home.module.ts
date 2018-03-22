import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeRouterModule } from './home-router.module';
import { CommunityComponent } from '../community/community.component';
import { FeedbackComponent } from '../feedback/feedback.component';
import { PlanetFormsModule } from '../shared/planet-forms.module';

import { NationComponent } from '../nation/nation.component';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';
import { DashboardTileComponent } from '../dashboard/dashboard-tile.component';
import { NotificationsComponent } from '../notifications/notifications.component';

@NgModule({
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    PlanetDialogsModule,
    HttpClientModule,
    HttpClientJsonpModule
  ],
  declarations: [
    HomeComponent,
    DashboardComponent,
    CommunityComponent,
    NationComponent,
    FeedbackComponent,
    ManagerDashboardComponent,
    DashboardTileComponent,
    NotificationsComponent
  ]
})
export class HomeModule {}
