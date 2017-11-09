import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { SharedModule } from '../shared/shared.module';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './resources-view.component';
import { ResourcesRouterModule } from './resources-router.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    ResourcesRouterModule
  ],
  declarations: [ResourcesComponent, ResourcesViewComponent]
})
export class ResourcesModule {}
