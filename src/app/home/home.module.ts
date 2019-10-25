import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeRouterModule } from './home-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';

import { MaterialModule } from '../shared/material.module';
import { DashboardTileComponent } from '../dashboard/dashboard-tile.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { PulsateIconDirective } from './pulsate-icon.directive';
import { UpgradeComponent } from '../upgrade/upgrade.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { UsersAchievementsModule } from '../users/users-achievements/users-achievements.module';
import { NewsModule } from '../news/news.module';
import { LogsMyPlanetComponent } from '../logs-myplanet/logs-myplanet.component';
import { TeamsModule } from '../teams/teams.module';
import { DashboardNotificationsDialogComponent } from '../dashboard/dashboard-notifications-dialog.component';
import { CommunityComponent } from '../community/community.component';
import { PlanetCalendarModule } from '../shared/calendar.module';

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
    SharedComponentsModule,
    UsersAchievementsModule,
    NewsModule,
    TeamsModule,
    PlanetCalendarModule
  ],
  declarations: [
    HomeComponent,
    DashboardComponent,
    DashboardTileComponent,
    DashboardNotificationsDialogComponent,
    NotificationsComponent,
    PulsateIconDirective,
    UpgradeComponent,
    LogsMyPlanetComponent,
    CommunityComponent
  ],
  entryComponents: [ DashboardNotificationsDialogComponent ]
})
export class HomeModule {}
