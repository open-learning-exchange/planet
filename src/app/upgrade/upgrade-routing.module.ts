import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { UpgradeComponent } from './upgrade.component';

const routes: Routes = [
  { path: '', component: UpgradeComponent },
  { path: 'myplanet', component: UpgradeComponent, data: { myPlanet: true } }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class UpgradeRoutingModule {}
