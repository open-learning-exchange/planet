import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './view-resources/resources-view.component';
import { ResourcesAddComponent } from './resources-add.component';

const routes: Routes = [
  { path: '', component: ResourcesComponent },
  { path: 'view/:id', component: ResourcesViewComponent },
  { path: 'add', component: ResourcesAddComponent },
  { path: 'update/:id', component: ResourcesAddComponent }
];

@NgModule({
  imports: [ RouterModule.forChild(routes) ],
  exports: [ RouterModule ]
})
export class ResourcesRouterModule {}
