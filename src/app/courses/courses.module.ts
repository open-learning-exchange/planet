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
import { CoursesProgressModule } from './progress-courses/courses-progress.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { ResourcesPickerDialogModule } from '../resources/resources-picker-dialog.module';
import { CoursesEnrollComponent } from './enroll-courses/courses-enroll.component';
import { UsersModule } from '../users/users.module';
import { CoursesIconComponent } from './courses-icon.component';
import { CoursesStepAttemptsDialogModule } from './step-view-courses/courses-step-attempts-dialog.module';
import { CoursesViewDetailModule } from './view-courses/courses-view-detail.module';
import { CoursesSearchComponent, CoursesSearchListComponent } from './search-courses/courses-search.component';
import { ChatModule } from '../chat/chat.module';

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
    ResourcesPickerDialogModule,
    CoursesStepAttemptsDialogModule,
    UsersModule,
    CoursesViewDetailModule,
    ChatModule,
    CoursesProgressModule,
    CoursesComponent,
    CoursesAddComponent,
    CoursesViewComponent,
    CoursesStepComponent,
    CoursesStepViewComponent,
    CoursesSearchComponent,
    CoursesSearchListComponent,
    CoursesEnrollComponent,
    CoursesIconComponent
  ],
  exports: [CoursesComponent]
})
export class CoursesModule {}
