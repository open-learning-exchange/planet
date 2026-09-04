import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CovalentTextEditorModule } from '@covalent/text-editor';
import { MaterialModule } from '@shared/material.module';
import { FormErrorMessagesComponent } from './form-error-messages.component';
import { PlanetRatingComponent } from '@shared/ratings/planet-rating.component';
import { PlanetRatingStarsComponent } from '@shared/ratings/planet-rating-stars.component';
import { PlanetStackedBarComponent } from '@shared/charts/planet-stacked-bar.component';
import { PlanetTagInputComponent } from '@shared/forms/tags/planet-tag-input.component';
import { PlanetTagSelectedInputComponent } from '@shared/forms/tags/planet-tag-selected-input.component';
import { PlanetStepListComponent, PlanetStepListFormDirective, PlanetStepListItemComponent,
  PlanetStepListActionsDirective, PlanetStepListNumberDirective } from '@shared/ui/planet-step-list.component';
import { PlanetMarkdownTextboxComponent } from '@shared/markdown/planet-markdown-textbox.component';
import { PlanetTagInputDialogComponent, PlanetTagInputToggleIconComponent } from '@shared/forms/tags/planet-tag-input-dialog.component';
import { SharedComponentsModule } from '@shared/shared-components.module';
import { PlanetTimeMaskDirective } from './planet-time-mask.directive';
import { PlanetSelectorComponent } from './planet-selector.component';
import { PlanetNumberValidatorDirective } from './planet-number-validator.directive';
import { PlanetRoundDirective } from './planet-round.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    CovalentTextEditorModule,
    SharedComponentsModule,
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent,
    PlanetTagInputComponent,
    PlanetTagSelectedInputComponent,
    PlanetTagInputDialogComponent,
    PlanetTagInputToggleIconComponent,
    PlanetSelectorComponent,
    PlanetStepListComponent,
    PlanetStepListFormDirective,
    PlanetStepListActionsDirective,
    PlanetStepListNumberDirective,
    PlanetStepListItemComponent,
    PlanetMarkdownTextboxComponent,
    PlanetTimeMaskDirective,
    PlanetNumberValidatorDirective,
    PlanetRoundDirective
  ],
  exports: [
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent,
    PlanetTagInputComponent,
    PlanetTagSelectedInputComponent,
    CovalentTextEditorModule,
    PlanetSelectorComponent,
    PlanetStepListComponent,
    PlanetStepListFormDirective,
    PlanetStepListActionsDirective,
    PlanetStepListNumberDirective,
    PlanetStepListItemComponent,
    PlanetMarkdownTextboxComponent,
    PlanetTimeMaskDirective,
    PlanetNumberValidatorDirective,
    PlanetRoundDirective
  ]
})
export class PlanetFormsModule {}
