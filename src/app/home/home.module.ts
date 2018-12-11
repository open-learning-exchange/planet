import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeRouterModule } from './home-router.module';
import { CommunityComponent } from '../community/community.component';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';

import { MaterialModule } from '../shared/material.module';
import { DashboardTileComponent } from '../dashboard/dashboard-tile.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { PulsateIconDirective } from './pulsate-icon.directive';
import { UpgradeComponent } from '../upgrade/upgrade.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { CommunityTableComponent } from '../community/community-table.component';

@NgModule({
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    HttpClientModule,
    HttpClientJsonpModule,
    PlanetDialogsModule,
    SharedComponentsModule
  ],
  declarations: [
    HomeComponent,
    DashboardComponent,
    CommunityComponent,
    CommunityTableComponent,
    DashboardTileComponent,
    NotificationsComponent,
    PulsateIconDirective,
    UpgradeComponent
  ]
})
export class HomeModule {}
