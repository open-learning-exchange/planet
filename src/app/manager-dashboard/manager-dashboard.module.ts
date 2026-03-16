import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { ReportsMyPlanetComponent } from './reports/myplanet/reports-myplanet.component';
import { LogsMyPlanetComponent } from './reports/myplanet/logs-myplanet.component';
import { MyPlanetToolbarComponent } from './reports/myplanet/myplanet-toolbar.component';
import { MyPlanetTableComponent } from './reports/myplanet/myplanet-table.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { ReportsDetailActivitiesComponent } from './reports/reports-detail-activities.component';
import { ReportsHealthComponent } from './reports/reports-health.component';
import { ManagerCurrencyComponent } from './manager-currency.component';

@NgModule({
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
    LogsMyPlanetComponent,
    MyPlanetToolbarComponent,
    MyPlanetTableComponent,
    ReportsDetailActivitiesComponent,
    ReportsHealthComponent,
    ManagerCurrencyComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    PlanetDialogsModule,
    ManagerDashboardRouterModule,
    ConfigurationModule,
    SharedComponentsModule
  ]
})
export class ManagerDashboardModule {}
