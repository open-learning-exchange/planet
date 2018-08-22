import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CovalentTextEditorModule } from '@covalent/text-editor';
import { CovalentMarkdownModule } from '@covalent/markdown';
import { MaterialModule } from '../material.module';
import { FormErrorMessagesComponent } from './form-error-messages.component';
import { PlanetRatingComponent } from './planet-rating.component';
import { PlanetRatingStarsComponent } from './planet-rating-stars.component';
import { PlanetStackedBarComponent } from './planet-stacked-bar.component';
import { PlanetTagInputComponent } from './planet-tag-input.component';
import { PlanetStepListComponent, PlanetStepListFormDirective, PlanetStepListItemComponent } from './planet-step-list.component';

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
    PlanetStackedBarComponent,
    PlanetTagInputComponent,
    CovalentTextEditorModule,
    CovalentMarkdownModule,
    PlanetStepListComponent,
    PlanetStepListFormDirective,
    PlanetStepListItemComponent
  ],
  declarations: [
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent,
    PlanetTagInputComponent,
    PlanetStackedBarComponent,
    PlanetStepListComponent,
    PlanetStepListFormDirective,
    PlanetStepListItemComponent
  ]
})
export class PlanetFormsModule {}
