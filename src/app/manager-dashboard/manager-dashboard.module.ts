import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { ManagerAIServicesComponent } from './manager-aiservices.component';
import { ManagerDashboardRouterModule } from './manager-dashboard-router.module';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { ManagerSyncComponent } from './manager-sync.component';
import { ManagerFetchComponent } from './manager-fetch.component';
import { ManagerDashboardConfigurationComponent } from './manager-dashboard-configuration.component';
import { ConfigurationModule } from '../configuration/configuration.module';
import { RequestsComponent } from '../manager-dashboard/requests/requests.component';
import { RequestsTableComponent } from './requests/requests-table.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsTableComponent } from './reports/reports-table.component';
import { ReportsDetailComponent } from './reports/reports-detail.component';
import { ReportsPendingComponent } from './reports/reports-pending.component';
import { PendingTableComponent } from './reports/pending-table.component';
import { ReportsMyPlanetComponent } from './reports/myplanet/reports.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { ReportsDetailActivitiesComponent } from './reports/reports-detail-activities.component';
import { ReportsHealthComponent } from './reports/reports-health.component';

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
    ConfigurationModule,
    SharedComponentsModule
  ],
  declarations: [
    ManagerAIServicesComponent,
    ManagerDashboardComponent,
    ManagerSyncComponent,
    ManagerFetchComponent,
    ManagerDashboardConfigurationComponent,
    RequestsComponent,
    RequestsTableComponent,
    ReportsComponent,
    ReportsTableComponent,
    ReportsDetailComponent,
    ReportsPendingComponent,
    PendingTableComponent,
    ReportsMyPlanetComponent,
    ReportsDetailActivitiesComponent,
    ReportsHealthComponent
  ]
})
export class ManagerDashboardModule {}
