import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientJsonpModule, HttpClientModule } from '@angular/common/http';

import { HomeComponent } from './home.component';
import { PlanetComponent } from './planet.component';
import { HomeRouterModule } from './home-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { PulsateIconDirective } from './pulsate-icon.directive';

@NgModule({
  imports: [
    HomeRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    MaterialModule,
    SharedComponentsModule,
    HttpClientModule,
    HttpClientJsonpModule,
  ],
  declarations: [
    HomeComponent,
    PlanetComponent,
    PulsateIconDirective,
  ]
})
export class HomeModule {}
