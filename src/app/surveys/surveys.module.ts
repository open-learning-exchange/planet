import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';

import { SurveysComponent } from './surveys.component';
import { ExamsModule } from '../exams/exams.module';
import { SurveysRouterModule } from './surveys-router.module';
import { SharedComponentsModule } from '../shared/shared-components.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    ExamsModule,
    SurveysRouterModule,
    SharedComponentsModule
  ],
  exports: [ SurveysComponent ],
  declarations: [
    SurveysComponent
  ]
})
export class SurveysModule {}
