import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';

const routes: Routes = [
  { path: '', component: TeamsComponent },
  { path: 'view/:teamId', component: TeamsViewComponent }
];
@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class TeamsRouterModule {}
