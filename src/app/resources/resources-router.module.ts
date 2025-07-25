import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UnsavedChangesGuard } from '../shared/unsaved-changes.guard';

import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './view-resources/resources-view.component';
import { ResourcesAddComponent } from './resources-add.component';

const routes: Routes = [
  { path: '', component: ResourcesComponent },
  { path: 'view/:id', component: ResourcesViewComponent },
  { path: 'add', component: ResourcesAddComponent, canDeactivate: [UnsavedChangesGuard] },
  { path: 'update/:id', component: ResourcesAddComponent, canDeactivate: [UnsavedChangesGuard] }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ResourcesRouterModule {}
