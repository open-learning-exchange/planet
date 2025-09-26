import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TeamsViewComponent } from './teams-view.component';

const routes: Routes = [
  { path: '', component: TeamsViewComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class TeamsServicesRoutingModule {}
