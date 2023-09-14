import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionsModule } from '../../submissions/submissions.module';
import { ExamsModule } from '../../exams/exams.module';
import { DialogsSubmissionsComponent } from './dialogs-submissions.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    SubmissionsModule,
    ExamsModule
  ],
  exports: [
    DialogsSubmissionsComponent
  ],
  declarations: [
    DialogsSubmissionsComponent
  ]
})
export class DialogsSubmissionsModule {}
