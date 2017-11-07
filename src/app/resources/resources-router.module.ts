import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './resources-view.component';

const routes: Routes = [
  { path: '', component: ResourcesComponent },
  { path: 'view/:id', component: ResourcesViewComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ResourcesRouterModule {}
