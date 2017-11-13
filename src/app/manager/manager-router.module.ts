import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { ManagerComponent } from './manager.component';
import { CommunityComponent } from '../community/community.component';
import { NationComponent } from '../nation/nation.component';
import { ManagerDashboardComponent } from '../manager-dashboard/manager-dashboard.component';

const routes: Routes = [
  { path: '', component: ManagerComponent,
    children: [
      { path: '', component: ManagerDashboardComponent },
      { path: 'community', component: CommunityComponent },
      { path: 'nation', component: NationComponent },
      { path: 'manager-dashboard', component: ManagerDashboardComponent }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ManagerRouterModule {}
