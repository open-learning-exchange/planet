import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoursesModule } from '../../courses/courses.module';
import { DialogsAddCoursesComponent } from './dialogs-add-courses.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    CoursesModule
  ],
  exports: [
    DialogsAddCoursesComponent
  ],
  declarations: [
    DialogsAddCoursesComponent
  ],
  entryComponents: [
    DialogsAddCoursesComponent
  ]
})
export class DialogsAddCoursesModule {}
