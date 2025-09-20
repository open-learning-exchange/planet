import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AuthService } from './shared/auth-guard.service';
import { HomeComponent } from './home/home.component';
import { UserGuard } from './shared/user-guard.service';
import { UnsavedChangesGuard } from './shared/unsaved-changes.guard';

const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule),
    canActivateChild: [ UserGuard ],
    canDeactivate: [ UnsavedChangesGuard ]
  },
  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule), canActivate: [ AuthService ] },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes, {}) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
