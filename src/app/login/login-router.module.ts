import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LoginComponent } from './login.component';
import { LoginFormComponent } from './login-form.component';
import { ConfigurationGuard } from '../configuration/configuration-guard.service';
import { ConfigurationComponent } from '../configuration/configuration.component';

const routes: Routes = [
  { path: '', component: LoginComponent,
    children: [
      { path: '', component: LoginFormComponent },
      { path: 'newmember', component: LoginFormComponent },
      { path: 'configuration', component: ConfigurationComponent,
      canActivate: [ ConfigurationGuard ] }
    ]
  }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class LoginRouterModule {}
