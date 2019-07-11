import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesRouterModule } from './courses-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { CoursesViewComponent } from './view-courses/courses-view.component';
import { CoursesStepComponent } from './add-courses/courses-step.component';
import { CoursesStepViewComponent } from './step-view-courses/courses-step-view.component';
import { ResourcesModule } from '../resources/resources.module';
import { ExamsModule } from '../exams/exams.module';
import { CoursesProgressLeaderComponent } from './progress-courses/courses-progress-leader.component';
import { CoursesProgressBarComponent } from './progress-courses/courses-progress-bar.component';
import { CoursesProgressChartComponent } from './progress-courses/courses-progress-chart.component';
import { CoursesProgressLearnerComponent } from './progress-courses/courses-progress-learner.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { DialogsAddResourcesModule } from '../shared/dialogs/dialogs-add-resources.module';

@NgModule({
  imports: [
    CoursesRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule,
    PlanetDialogsModule,
    MaterialModule,
    ResourcesModule,
    ExamsModule,
    SharedComponentsModule,
    DialogsAddResourcesModule
  ],
  declarations: [
    CoursesComponent,
    CoursesAddComponent,
    CoursesViewComponent,
    CoursesStepComponent,
    CoursesStepViewComponent,
    CoursesProgressLeaderComponent,
    CoursesProgressLearnerComponent,
    CoursesProgressBarComponent,
    CoursesProgressChartComponent
  ]
})
export class CoursesModule {}
