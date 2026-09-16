import { MaterialModule } from '../../shared/material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesModule } from '../resources.module';
import { ResourcesViewerDialogComponent } from './resources-viewer-dialog.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    ResourcesModule,
    ResourcesViewerDialogComponent
  ],
  exports: [
    ResourcesViewerDialogComponent
  ]
})
export class ResourcesViewerDialogModule {}
