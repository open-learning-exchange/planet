import { NgModule } from '@angular/core';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { Routes, RouterModule } from '@angular/router';
import { ManagerSyncComponent } from './manager-sync.component';
import { ManagerDashboardConfigurationComponent } from './manager-dashboard-configuration.component';
import { ActivityLogsComponent } from './reports/activity-logs.component';
import { ActivityLogsReportComponent } from './reports/activity-logs-report.component';

const routes: Routes = [
  { path: '', component: ManagerDashboardComponent },
  { path: 'sync', component: ManagerSyncComponent },
  { path: 'meetups', loadChildren: '../meetups/meetups.module#MeetupsModule', data: { parent: true } },
  { path: 'courses', loadChildren: '../courses/courses.module#CoursesModule', data: { parent: true } },
  { path: 'resources', loadChildren: '../resources/resources.module#ResourcesModule', data: { parent: true } },
  { path: 'configuration', component: ManagerDashboardConfigurationComponent, data: { update: true } },
  { path: 'users', loadChildren: '../users/users.module#UsersModule' },
  { path: 'reports', component: ActivityLogsComponent },
  { path: 'reports/detail', component: ActivityLogsReportComponent }
];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class ManagerDashboardRouterModule {}
