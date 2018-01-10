import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { ConfigurationModule } from './configuration/configuration.module'
import { AuthService } from './shared/auth-guard.service';

export const routes: Routes = [
  { path: '', loadChildren: './home/home.module#HomeModule', canActivateChild: [ AuthService ] },
  { path: 'login', loadChildren: './login/login.module#LoginModule' },
  { path: 'configuration', component: ConfigurationComponent },
  { path: '**', component: PageNotFoundComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes), ConfigurationModule ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
