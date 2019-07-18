import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { AuthService } from './shared/auth-guard.service';

export const routes: Routes = [
  { path: '', loadChildren: () => import('./home/home.module').then(m => m.HomeModule), canActivateChild: [ AuthService ] },
  { path: 'login', loadChildren: () => import('./login/login.module').then(m => m.LoginModule), canActivate: [ AuthService ] },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
