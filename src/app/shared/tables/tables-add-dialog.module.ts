import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoursesModule } from '../../courses/courses.module';
import { UsersModule } from '../../users/users.module';
import { TeamsModule } from '../../teams/teams.module';
import { TablesAddDialogComponent } from './tables-add-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    CoursesModule,
    UsersModule,
    TeamsModule,
    TablesAddDialogComponent
  ],
  exports: [
    TablesAddDialogComponent
  ]
})
export class TablesAddDialogModule {}
