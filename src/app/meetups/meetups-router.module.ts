import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './meetups-add.component';

const routes: Routes = [
  { path: '', component: MeetupsComponent },
  { path: 'add', component: MeetupsAddComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MeetupsRouterModule {}
