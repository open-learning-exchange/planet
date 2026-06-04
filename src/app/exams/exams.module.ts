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
import { ExamsPreviewComponent } from './exams-preview.component';
import { ExamsQuestionFrameComponent } from './exams-question-frame.component';
import { ExamsTakeWidgetComponent } from './exams-take/exams-take-widget.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    SharedComponentsModule,
    ExamsAddComponent,
    ExamsQuestionComponent,
    ExamsViewComponent,
    ExamsPreviewComponent,
    ExamsQuestionFrameComponent,
    ExamsTakeWidgetComponent
  ],
  exports: [
    ExamsAddComponent,
    ExamsViewComponent,
    ExamsQuestionFrameComponent,
    ExamsTakeWidgetComponent
  ]
})
export class ExamsModule {}
