import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UsersComponent } from './users.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';
import { UsersAchievementsComponent } from './users-achievements/users-achievements.component';

const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: 'profile/:name', component: UsersProfileComponent },
  { path: 'update/:name', component: UsersUpdateComponent },
  { path: 'achievements/:name', component: UsersAchievementsComponent },
  { path: 'submission', component: UsersUpdateComponent, data: { submission: true } }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class UsersRouterModule {}
