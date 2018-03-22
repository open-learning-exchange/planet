import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { ResourcesComponent } from './resources.component';
import { ResourcesViewComponent } from './view-resources/resources-view.component';
import { ResourcesAddComponent } from './resources-add.component';
import { ResourcesRouterModule } from './resources-router.module';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';

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
    PlanetDialogsModule
  ],
  declarations: [ ResourcesComponent, ResourcesViewComponent, ResourcesAddComponent ]
})
export class ResourcesModule {}
