import { MaterialModule } from '../shared/material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetupsModule } from './meetups.module';
import { MeetupsAddDialogComponent } from './meetups-add-dialog.component';

@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    MeetupsModule,
    MeetupsAddDialogComponent
  ],
  exports: [
    MeetupsAddDialogComponent
  ]
})
export class MeetupsAddDialogModule {}
