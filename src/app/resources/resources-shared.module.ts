import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { SharedComponentsModule } from '../shared/shared-components.module';

import { ResourcesViewerComponent } from './view-resources/resources-viewer.component';
import { ResourcesAddComponent } from './resources-add.component';
import { ResourcesSearchComponent, ResourcesSearchListComponent } from './search-resources/resources-search.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    HttpClientModule,
    HttpClientJsonpModule,
    SharedComponentsModule
  ],
  declarations: [
    ResourcesViewerComponent,
    ResourcesAddComponent,
    ResourcesSearchComponent,
    ResourcesSearchListComponent
  ],
  exports: [
    ResourcesViewerComponent,
    ResourcesAddComponent,
    ResourcesSearchComponent,
    ResourcesSearchListComponent
  ]
})
export class ResourcesSharedModule {}
