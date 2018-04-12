import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './view-resources/resources-view.component';
import { ResourcesAddComponent } from './resources-add.component';

const routes: Routes = [
  { path: '', component: ResourcesComponent },
  { path: 'view/:id', component: ResourcesViewComponent },
  { path: 'view/:id', component: ResourcesViewComponent, data: { parent: true } },
  { path: 'add', component: ResourcesAddComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ResourcesRouterModule {}
