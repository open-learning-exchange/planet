import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HealthListComponent } from './health-list.component';

const routes: Routes = [
  { path: '', component: HealthListComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class HealthListRoutingModule {}
