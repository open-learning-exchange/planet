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
import { PlanetStepListComponent, PlanetStepListFormDirective, PlanetStepListItemComponent,
  PlanetStepListActionsDirective, PlanetStepListNumberDirective } from './planet-step-list.component';
import { PlanetMarkdownTextboxComponent } from './planet-markdown-textbox.component';
import { PlanetTagInputDialogComponent, PlanetTagInputToggleIconComponent } from './planet-tag-input-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    CovalentTextEditorModule
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
    PlanetStepListActionsDirective,
    PlanetStepListNumberDirective,
    PlanetStepListItemComponent,
    PlanetMarkdownTextboxComponent
  ],
  declarations: [
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent,
    PlanetTagInputComponent,
    PlanetTagInputDialogComponent,
    PlanetTagInputToggleIconComponent,
    PlanetStackedBarComponent,
    PlanetStepListComponent,
    PlanetStepListFormDirective,
    PlanetStepListActionsDirective,
    PlanetStepListNumberDirective,
    PlanetStepListItemComponent,
    PlanetMarkdownTextboxComponent
  ],
  entryComponents: [ PlanetTagInputDialogComponent ]
})
export class PlanetFormsModule {}
