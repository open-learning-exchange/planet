import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ActivityLogsComponent } from './activity-logs.component';
import { ActivityLogsReportComponent } from './activity-logs-report.component';

const routes: Routes = [
  { path: '', component: ActivityLogsComponent },
  { path: 'logs', component: ActivityLogsReportComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ActivityLogsRouterModule {}
