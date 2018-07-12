import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '../shared/material.module';
import { RatingComponent } from './rating.component';
import { PlanetStackedBarComponent } from '../shared/planet-stacked-bar.component';
import { PlanetFormsModule } from '../shared/planet-forms.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    PlanetFormsModule
  ],
  declarations: [
    RatingComponent,
    PlanetStackedBarComponent
  ],
  exports: [
    RatingComponent
  ]
})
export class RatingModule {}
