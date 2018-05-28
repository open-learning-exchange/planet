import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';

import { ConfigurationRouterModule } from './configuration-router.module';
import { ConfigurationComponent } from './configuration.component';
import { ConnectComponent } from './connect.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    ConfigurationRouterModule,
    MaterialModule,
    HttpClientModule,
    HttpClientJsonpModule,
    PlanetDialogsModule
  ],
  declarations: [
    ConfigurationComponent,
    ConnectComponent
  ],
  exports: [
    ConfigurationComponent,
    ConnectComponent
  ]
})
export class ConfigurationModule {}
