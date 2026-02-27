import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesSharedModule } from '../../resources/resources-shared.module';
import { DialogsResourcesViewerComponent } from './dialogs-resources-viewer.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    ResourcesSharedModule
  ],
  exports: [
    DialogsResourcesViewerComponent
  ],
  declarations: [
    DialogsResourcesViewerComponent
  ]
})
export class DialogsResourcesViewerModule {}
