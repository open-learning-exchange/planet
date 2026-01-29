import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesRouterModule } from './courses-router.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';
import { CoursesStepComponent } from './add-courses/courses-step.component';
import { CoursesStepViewComponent } from './step-view-courses/courses-step-view.component';
import { ResourcesModule } from '../resources/resources.module';
import { ExamsModule } from '../exams/exams.module';
import { CoursesProgressLeaderComponent } from './progress-courses/courses-progress-leader.component';
import { CoursesProgressChartComponent } from './progress-courses/courses-progress-chart.component';
import { CoursesProgressLearnerComponent } from './progress-courses/courses-progress-learner.component';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { DialogsAddResourcesModule } from '../shared/dialogs/dialogs-add-resources.module';
import { CoursesEnrollComponent } from './enroll-courses/courses-enroll.component';
import { UsersModule } from '../users/users.module';
import { DialogsSubmissionsModule } from '../shared/dialogs/dialogs-submissions.module';
import { CoursesViewDetailModule } from './view-courses/courses-view-detail.module';
import { CoursesSearchComponent, CoursesSearchListComponent } from './search-courses/courses-search.component';
import { ChatModule } from '../chat/chat.module';
import { CoursesSharedModule } from './courses-shared.module';
import { CoursesViewModule } from './view-courses/courses-view.module';

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
    DialogsAddResourcesModule,
    DialogsSubmissionsModule,
    UsersModule,
    CoursesViewDetailModule,
    ChatModule,
    CoursesSharedModule,
    CoursesViewModule
  ],
  declarations: [
    CoursesComponent,
    CoursesAddComponent,
    CoursesStepComponent,
    CoursesStepViewComponent,
    CoursesSearchComponent,
    CoursesSearchListComponent,
    CoursesProgressLeaderComponent,
    CoursesProgressLearnerComponent,
    CoursesProgressChartComponent,
    CoursesEnrollComponent
  ],
  exports: [ CoursesComponent ]
})
export class CoursesModule {}
