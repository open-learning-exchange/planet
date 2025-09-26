import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CommunityComponent } from './community.component';

const routes: Routes = [
  { path: '', component: CommunityComponent },
  { path: 'voices/:id', component: CommunityComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class CommunityHomeRoutingModule {}
