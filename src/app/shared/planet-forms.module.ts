import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from './material.module';
import { FormErrorMessagesComponent } from './form-error-messages.component';
import { PlanetRatingComponent } from './planet-rating.component';

@NgModule({
  imports: [
    CommonModule, MaterialModule
  ],
  exports: [
    FormErrorMessagesComponent, PlanetRatingComponent
  ],
  declarations: [
    FormErrorMessagesComponent, PlanetRatingComponent
  ]
})
export class PlanetFormsModule {}
