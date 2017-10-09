import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MeetupsComponent } from './meetups.component';
import { MeetupsaddComponent } from './meetupsadd.component';

const routes: Routes = [
  { path: '', component: MeetupsComponent},
  { path: 'add', component: MeetupsaddComponent}
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MeetupsRouterModule {}
