import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module';
import { CommunityComponent } from '../community/community.component';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { PlanetAlertsModule } from '../shared/alerts/planet-alerts.module';
import { NationValidatorService } from '../validators/nation-validator.service';
import { NationComponent } from '../nation/nation.component';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';

@NgModule({
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetAlertsModule
  ],
  declarations: [
    HomeComponent,
    DashboardComponent,
    NavigationComponent,
    UsersComponent,
    CommunityComponent,
    NationComponent,
    ManagerDashboardComponent
  ],
  providers: [ NationValidatorService ]
})
export class HomeModule {}
