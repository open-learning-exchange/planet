import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UsersComponent } from './users.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';

const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: 'profile/:name', component: UsersProfileComponent },
  { path: 'update/:name', component: UsersUpdateComponent },
  { path: 'submission', component: UsersUpdateComponent, data: { submission: true } }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class UsersRouterModule {}
