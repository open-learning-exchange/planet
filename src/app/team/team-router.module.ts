import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { TeamComponent } from './team.component';
import { TeamMemberComponent } from './team-member.component';

const routes: Routes = [
  { path: '', component: TeamComponent },
  { path: 'member/:teamId', component: TeamMemberComponent }
];
@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class TeamRouterModule {}
