import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { ManagerDashboardRouterModule } from './manger-dashboard-router.module';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { AddTeamComponent } from './add-team/add-team.component';
import { CreateNewTeamComponent } from './create-new-team/create-new-team.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    PlanetDialogsModule,
    ManagerDashboardRouterModule,
    HttpClientModule,
    HttpClientJsonpModule
  ],
  declarations: [
    ManagerDashboardComponent,
    AddTeamComponent,
    CreateNewTeamComponent
  ]
})
export class ManagerDashboardModule {}
