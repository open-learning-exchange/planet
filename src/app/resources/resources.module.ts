import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './view-resources/resources-view.component';
import { ResourcesViewerComponent } from './view-resources/resources-viewer.component';
import { ResourcesAddComponent } from './resources-add.component';
import { ResourcesRouterModule } from './resources-router.module';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { TextMaskModule } from 'angular2-text-mask';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    ResourcesRouterModule,
    MaterialModule,
    HttpClientModule,
    HttpClientJsonpModule,
    PlanetDialogsModule,
    SharedComponentsModule,
    TextMaskModule
  ],
  declarations: [
    ResourcesComponent,
    ResourcesViewComponent,
    ResourcesViewerComponent,
    ResourcesAddComponent
  ],
  exports: [ ResourcesViewerComponent ]
})
export class ResourcesModule {}
