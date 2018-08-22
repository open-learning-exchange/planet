import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ExamsAddComponent } from './exams-add.component';
import { ExamsQuestionComponent } from './exams-question.component';
import { ExamsViewComponent } from './exams-view.component';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    SharedComponentsModule
  ],
  declarations: [
    ExamsAddComponent,
    ExamsQuestionComponent,
    ExamsViewComponent
  ],
  exports: [
    ExamsAddComponent
  ]
})
export class ExamsModule {}
