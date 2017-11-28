import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CoursesComponent } from './courses.component';
import { CoursesAddComponent } from './add-courses/courses-add.component';
import { CoursesRequestComponent } from './request-courses/courses-request.component';
import { CoursesRouterModule } from './courses-router.module';
import { PlanetFormsModule } from '../shared/planet-forms.module';
import { CourseValidatorService } from '../validators/course-validator.service';
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
    CoursesRequestComponent
  ],
  providers: [ CourseValidatorService ]
})
export class CoursesModule {}
