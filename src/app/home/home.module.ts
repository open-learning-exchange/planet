import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { HomeRouterModule } from './home-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { DashboardTileComponent, DashboardTileTitleComponent } from '../dashboard/dashboard-tile.component';
import { NotificationsComponent } from '../notifications/notifications.component';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { PulsateIconDirective } from './pulsate-icon.directive';
import { UpgradeComponent } from '../upgrade/upgrade.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { UsersAchievementsModule } from '../users/users-achievements/users-achievements.module';
import { NewsModule } from '../news/news.module';
import { TeamsModule } from '../teams/teams.module';
import { CommunityComponent } from '../community/community.component';
import { PlanetCalendarModule } from '../shared/calendar.module';
import { CommunityLinkDialogComponent } from '../community/community-link-dialog.component';
import { HealthListComponent } from '../health/health-list.component';
import { UsersModule } from '../users/users.module';
import { CoursesViewDetailModule } from '../courses/view-courses/courses-view-detail.module';
import { ChatModule } from '../chat/chat.module';
import { SurveysModule } from '../surveys/surveys.module';

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
    PlanetCalendarModule,
    UsersModule,
    CoursesViewDetailModule,
    ChatModule,
    SurveysModule
  ],
  declarations: [
    HomeComponent,
    DashboardComponent,
    DashboardTileComponent,
    DashboardTileTitleComponent,
    NotificationsComponent,
    PulsateIconDirective,
    UpgradeComponent,
    CommunityComponent,
    CommunityLinkDialogComponent,
    HealthListComponent,
  ]
})
export class HomeModule {}