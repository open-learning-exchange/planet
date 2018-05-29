import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';
import { CoursesRouterModule } from './courses-router.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { CoursesViewComponent } from './view-courses/courses-view.component';
import { CoursesStepComponent } from './add-courses/courses-step.component';
import { ExamsAddComponent } from '../exams/exams-add.component';
import { ExamsQuestionComponent } from '../exams/exams-question.component';
import { CoursesStepViewComponent } from './step-view-courses/courses-step-view.component';
import { CoursesService } from './courses.service';
import { ResourcesViewerComponent } from '../resources/view-resources/resources-viewer.component';
import { ExamsViewComponent } from '../exams/exams-view.component';
import { CoursesService as PouchCoursesService } from '../shared/services';

@NgModule({
  imports: [
    CoursesRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule
  ],
  declarations: [
    CoursesComponent,
    CoursesAddComponent,
    CoursesRequestComponent,
    CoursesViewComponent,
    CoursesStepComponent,
    CoursesStepViewComponent,
    ResourcesViewerComponent,
    ExamsAddComponent,
    ExamsQuestionComponent,
    ExamsViewComponent
  ],
  providers: [
    CoursesService,
    PouchCoursesService
  ]
})
export class CoursesModule {}
