import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../material.module';
import { FormErrorMessagesComponent } from './form-error-messages.component';
import { PlanetRatingComponent } from './planet-rating.component';
import { PlanetRatingStarsComponent } from './planet-rating-stars.component';
import { PlanetStackedBarComponent } from './planet-stacked-bar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule
  ],
  exports: [
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent
  ],
  declarations: [
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent
  ]
})
export class PlanetFormsModule {}
