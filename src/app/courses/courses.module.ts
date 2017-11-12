import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';
import { CoursesRouterModule } from './courses-router.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { CourseValidatorService } from '../validators/course-validator.service';

@NgModule({
  imports: [
    CoursesRouterModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PlanetFormsModule
  ],
  declarations: [
    CoursesComponent,
    CoursesAddComponent,
    CoursesRequestComponent
  ],
<<<<<<< HEAD
<<<<<<< HEAD
  providers: [ CourseValidatorService ]
=======
  providers: [CourseValidatorService]
>>>>>>> Add courses list view (Fixes #83) (#107)
=======
  providers: [ CourseValidatorService ]
>>>>>>> 8ed5f702c96aa17fdbb1e54fe90cc1ed044c59eb
})
export class CoursesModule {}
