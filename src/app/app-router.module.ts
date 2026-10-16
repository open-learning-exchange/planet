import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuard } from '@shared/auth/auth.guard';
import { UserGuard } from '@shared/auth/user.guard';
import { UnsavedChangesGuard } from '@shared/unsaved-changes/unsaved-changes.guard';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { HomeComponent } from './home/home.component';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
    canActivateChild: [ UserGuard ],
    canDeactivate: [ UnsavedChangesGuard ]
  },
  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule), canActivate: [ AuthGuard ] },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, {}) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
