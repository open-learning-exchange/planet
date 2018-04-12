import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './add-meetups/meetups-add.component';
import { MeetupsViewComponent } from './view-meetups/meetups-view.component';

const routes: Routes = [
  { path: '', component: MeetupsComponent },
  { path: 'add', component: MeetupsAddComponent },
  { path: 'update/:id', component: MeetupsAddComponent },
  { path: 'view/:id', component: MeetupsViewComponent },
  { path: 'view/:id', component: MeetupsViewComponent, data: { parent: true } }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MeetupsRouterModule {}
