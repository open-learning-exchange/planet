import { MaterialModule } from '../shared/material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesModule } from './resources.module';
import { ResourcesPickerDialogComponent } from './resources-picker-dialog.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    ResourcesModule,
    ResourcesPickerDialogComponent
  ],
  exports: [
    ResourcesPickerDialogComponent
  ]
})
export class ResourcesPickerDialogModule {}
