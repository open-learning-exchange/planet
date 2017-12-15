import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JsonpModule, Jsonp, Response } from '@angular/http';

import { HomeComponent } from './home.component';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { NavigationComponent } from './navigation.component';
import { UsersComponent } from '../users/users.component';

import { HomeRouterModule } from './home-router.module';
import { CommunityComponent } from '../community/community.component';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { ValidatorService } from '../validators/validator.service';
import { NationComponent } from '../nation/nation.component';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';

@NgModule({
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    PlanetDialogsModule,
    JsonpModule
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
  providers: [ ValidatorService ]
})
export class HomeModule {}
