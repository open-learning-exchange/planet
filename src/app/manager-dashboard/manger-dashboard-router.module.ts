import { NgModule } from '@angular/core';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { Routes, RouterModule } from '@angular/router';
import { ManagerSyncComponent } from './manager-sync.component';
import { ManagerFetchComponent } from './manager-fetch.component';
import { ManagerDashboardConfigurationComponent } from './manager-dashboard-configuration.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsDetailComponent } from './reports/reports-detail.component';
import { ReportsPendingComponent } from './reports/reports-pending.component';

const routes: Routes = [
  { path: '', component: ManagerDashboardComponent },
  { path: 'sync', component: ManagerSyncComponent },
  { path: 'fetch', component: ManagerFetchComponent },
  { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule', data: { parent: true } },
  { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule', data: { parent: true } },
  { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule', data: { parent: true } },
  { path: 'configuration', component: ManagerDashboardConfigurationComponent, data: { update: true } },
  { path: 'users', loadChildren: '../users/users.module#UsersModule' },
  { path: 'reports', component: ReportsComponent },
  { path: 'reports/detail', component: ReportsDetailComponent },
  { path: 'reports/pending', component: ReportsPendingComponent }
];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class ManagerDashboardRouterModule {}
