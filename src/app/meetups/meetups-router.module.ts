import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UnsavedChangesGuard } from '../shared/unsaved-changes.guard';

import { MeetupsComponent } from './meetups.component';
import { MeetupsAddComponent } from './add-meetups/meetups-add.component';
import { MeetupsViewComponent } from './view-meetups/meetups-view.component';

const routes: Routes = [
  { path: '', component: MeetupsComponent },
  { path: 'add', component: MeetupsAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'update/:id', component: MeetupsAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'view/:id', component: MeetupsViewComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class MeetupsRouterModule {}
