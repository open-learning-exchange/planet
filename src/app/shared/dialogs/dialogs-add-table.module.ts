import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoursesModule } from '../../courses/courses.module';
import { UsersModule } from '../../users/users.module';
import { TeamsModule } from '../../teams/teams.module';
import { DialogsAddTableComponent } from './dialogs-add-table.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    CoursesModule,
    UsersModule,
    TeamsModule
  ],
  exports: [
    DialogsAddTableComponent
  ],
  declarations: [
    DialogsAddTableComponent
  ]
})
export class DialogsAddTableModule {}
