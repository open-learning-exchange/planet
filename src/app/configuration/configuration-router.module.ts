import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ConfigurationComponent } from './configuration.component';
import { ConnectComponent } from './connect.component';

const routes: Routes = [
  { path: '', component: ConfigurationComponent },
  { path: 'connect', component: ConnectComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})

export class ConfigurationRouterModule { }
