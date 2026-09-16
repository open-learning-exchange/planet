import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CovalentTextEditorModule } from '@covalent/text-editor';
import { MaterialModule } from '../material.module';
import { FormErrorMessagesComponent } from './form-error-messages.component';
import { PlanetRatingComponent } from '../ratings/planet-rating.component';
import { PlanetRatingStarsComponent } from '../ratings/planet-rating-stars.component';
import { PlanetStackedBarComponent } from '../charts/planet-stacked-bar.component';
import { PlanetTagInputComponent } from './tags/planet-tag-input.component';
import { PlanetTagSelectedInputComponent } from './tags/planet-tag-selected-input.component';
import { PlanetStepListComponent, PlanetStepListFormDirective, PlanetStepListItemComponent,
  PlanetStepListActionsDirective, PlanetStepListNumberDirective } from '../ui/planet-step-list.component';
import { PlanetMarkdownTextboxComponent } from '../markdown/planet-markdown-textbox.component';
import { PlanetTagInputDialogComponent, PlanetTagInputToggleIconComponent } from './tags/planet-tag-input-dialog.component';
import { SharedComponentsModule } from '../shared-components.module';
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
