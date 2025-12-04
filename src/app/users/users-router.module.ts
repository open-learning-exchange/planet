import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UnsavedChangesGuard } from '../shared/unsaved-changes.guard';

import { UsersComponent } from './users.component';
import { UsersArchiveComponent } from './users-archive/users-archive.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';
import { UsersAchievementsComponent } from './users-achievements/users-achievements.component';
import { UsersAchievementsUpdateComponent } from './users-achievements/users-achievements-update.component';

const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: 'delete/request', component: UsersArchiveComponent },
  { path: 'profile/:name', component: UsersProfileComponent },
  { path: 'update/:name', component: UsersUpdateComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'profile/:name/achievements', component: UsersAchievementsComponent, data: { requiresAuth: false } },
  { path: 'profile/:name/achievements/update', component: UsersAchievementsUpdateComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'submission', component: UsersUpdateComponent, data: { submission: true }, canDeactivate: [UnsavedChangesGuard] },
  { path: 'my-achievements', component: UsersAchievementsComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class UsersRouterModule {}
