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
import { PlanetTagSelectedInputComponent } from './planet-tag-selected-input.component';
import { PlanetStepListComponent, PlanetStepListFormDirective, PlanetStepListItemComponent,
  PlanetStepListActionsDirective, PlanetStepListNumberDirective } from './planet-step-list.component';
import { PlanetMarkdownTextboxComponent } from './planet-markdown-textbox.component';
import { PlanetTagInputDialogComponent, PlanetTagInputToggleIconComponent } from './planet-tag-input-dialog.component';
import { SharedComponentsModule } from '../shared-components.module';
import { PlanetTimeMaskDirective } from './planet-time-mask.directive';
import { PlanetSelectorComponent } from './planet-selector.component';
import { PlanetNumberValidatorDirective } from './planet-number-validator.directive';
import { PlanetRoundDirective } from './planet-round.directive';
import { FileInputComponent } from './file-input.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    CovalentTextEditorModule,
    SharedComponentsModule
  ],
  exports: [
    FormErrorMessagesComponent,
    PlanetRatingComponent,
    PlanetRatingStarsComponent,
    PlanetStackedBarComponent,
    PlanetTagInputComponent,
    PlanetTagSelectedInputComponent,
    CovalentTextEditorModule,
    CovalentMarkdownModule,
    PlanetSelectorComponent,
    PlanetStepListComponent,
    FileInputComponent,
    PlanetStepListFormDirective,
    PlanetStepListActionsDirective,
    PlanetStepListNumberDirective,
    PlanetStepListItemComponent,
    PlanetMarkdownTextboxComponent,
    PlanetTimeMaskDirective,
    PlanetNumberValidatorDirective,
    PlanetRoundDirective
  ],
  declarations: [
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
    FileInputComponent,
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
