import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { ManagerDashboardRouterModule } from './manger-dashboard-router.module';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { ManagerSyncComponent } from './manager-sync.component';
import { ManagerFetchComponent } from './manager-fetch.component';
import { ManagerDashboardConfigurationComponent } from './manager-dashboard-configuration.component';
import { ConfigurationModule } from '../configuration/configuration.module';
import { ReportsComponent } from './reports/reports.component';
import { ReportsTableComponent } from './reports/reports-table.component';
import { ReportsDetailComponent } from './reports/reports-detail.component';

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
    HttpClientJsonpModule,
    ConfigurationModule
  ],
  declarations: [
    ManagerDashboardComponent,
    ManagerSyncComponent,
    ManagerFetchComponent,
    ManagerDashboardConfigurationComponent,
    ReportsComponent,
    ReportsTableComponent,
    ReportsDetailComponent
  ]
})
export class ManagerDashboardModule {}
