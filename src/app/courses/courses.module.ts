import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CourseOpenComponent } from './open-course/course-open.component';
import { CourseManageComponent } from './manage-course/course-manage.component';
import { CourseViewComponent } from './view-course/course-view.component';
import { CourseCreditsComponent } from './credits-course/course-credits.component';
import { CourseProgressComponent } from './progress-course/course-progress.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';
import { CoursesRouterModule } from './courses-router.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { PlanetDialogsModule } from '../shared/dialogs/planet-dialogs.module';
import { MaterialModule } from '../shared/material.module';

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
    CourseOpenComponent,
    CourseManageComponent,
    CourseViewComponent,
    CourseCreditsComponent,
    CourseProgressComponent
  ],
  providers: []
})
export class CoursesModule {}
