import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeamsComponent } from './teams.component';
import { TeamsViewComponent } from './teams-view.component';

const routes: Routes = [
  { path: '', component: TeamsComponent },
  { path: 'view/:teamId', component: TeamsViewComponent },
  {
    path: 'view/:teamId/surveys',
    loadChildren: () => import('../surveys/surveys.module').then(m => m.SurveysModule)
  },
  { path: 'users', loadChildren: () => import('../users/users.module').then(m => m.UsersModule) },
];
@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class TeamsRouterModule {}
