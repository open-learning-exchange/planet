import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UsersComponent } from './users.component';
import { UsersProfileComponent } from './users-profile/users-profile.component';
import { UsersUpdateComponent } from './users-update/users-update.component';

const routes: Routes = [
  { path: '', component: UsersComponent },
  { path: 'associated', component: UsersComponent, data: { associated: true } },
  { path: 'profile/:name', component: UsersProfileComponent },
  { path: 'update/:name', component: UsersUpdateComponent },
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class UsersRouterModule {}
