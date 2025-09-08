import { NgModule } from '@angular/core';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { Routes, RouterModule } from '@angular/router';
import { ManagerSyncComponent } from './manager-sync.component';
import { ManagerFetchComponent } from './manager-fetch.component';
import { ManagerAIServicesComponent } from './manager-aiservices.component';
import { ManagerDashboardConfigurationComponent } from './manager-dashboard-configuration.component';
import { ManagerCurrencyComponent } from './manager-currency.component';
import { ReportsComponent } from './reports/reports.component';
import { ReportsDetailComponent } from './reports/reports-detail.component';
import { ReportsPendingComponent } from './reports/reports-pending.component';
import { ReportsMyPlanetComponent } from './reports/reports-myplanet.component';
import { RequestsComponent } from './requests/requests.component';
import { LogsMyPlanetComponent } from './reports/logs-myplanet.component';

const routes: Routes = [
  { path: '', component: ManagerDashboardComponent },
  { path: 'aiservices', component: ManagerAIServicesComponent },
  { path: 'currency', component: ManagerCurrencyComponent },
  { path: 'certifications', loadChildren: () => import('./certifications/certifications.module').then(m => m.CertificationsModule) },
  { path: 'sync', component: ManagerSyncComponent },
  { path: 'fetch', component: ManagerFetchComponent },
  { path: 'meetups', loadChildren: () => import('../meetups/meetups.module').then(m => m.MeetupsModule), data: { parent: true } },
  { path: 'courses', loadChildren: () => import('../courses/courses.module').then(m => m.CoursesModule), data: { parent: true } },
  { path: 'surveys', loadChildren: () => import('../surveys/surveys.module').then(m => m.SurveysModule) },
  { path: 'surveys/:surveyId', loadChildren: () => import('../submissions/submissions.module').then(m => m.SubmissionsModule) },
  { path: 'resources', loadChildren: () => import('../resources/resources.module').then(m => m.ResourcesModule), data: { parent: true } },
  { path: 'configuration', component: ManagerDashboardConfigurationComponent, data: { update: true } },
  { path: 'users', loadChildren: () => import('../users/users.module').then(m => m.UsersModule) },
  { path: 'reports', component: ReportsComponent },
  { path: 'reports/detail', component: ReportsDetailComponent },
  { path: 'reports/pending', component: ReportsPendingComponent },
  { path: 'reports/myplanet', component: ReportsMyPlanetComponent },
  { path: 'logs/myplanet', component: LogsMyPlanetComponent },
  { path: 'requests', component: RequestsComponent }
];

@NgModule({
    imports: [ RouterModule.forChild(routes) ],
    exports: [ RouterModule ]
})
export class ManagerDashboardRouterModule {}
