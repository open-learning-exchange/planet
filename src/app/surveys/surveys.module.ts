import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';

import { SurveysComponent } from './surveys.component';
import { ExamsModule } from '../exams/exams.module';
import { SurveysRouterModule } from './surveys-router.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    ExamsModule,
    SurveysRouterModule
  ],
  declarations: [
    SurveysComponent
  ]
})
export class SurveysModule {}
