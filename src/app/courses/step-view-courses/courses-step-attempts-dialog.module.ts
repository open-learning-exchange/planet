import { MaterialModule } from '../../shared/material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionsModule } from '../../submissions/submissions.module';
import { ExamsModule } from '../../exams/exams.module';
import { CoursesStepAttemptsDialogComponent } from './courses-step-attempts-dialog.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    SubmissionsModule,
    ExamsModule,
    CoursesStepAttemptsDialogComponent
  ],
  exports: [
    CoursesStepAttemptsDialogComponent
  ]
})
export class CoursesStepAttemptsDialogModule {}
