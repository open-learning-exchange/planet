import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './meetups-add.component';
import { AuthService } from '../shared/auth-guard.service';

const routes: Routes = [
  { path: '', component: MeetupsComponent },
  { path: 'add', component: MeetupsAddComponent, canActivate: [ AuthService ] }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MeetupsRouterModule {}
