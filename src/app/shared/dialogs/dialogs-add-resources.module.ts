import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesSharedModule } from '../../resources/resources-shared.module';
import { DialogsAddResourcesComponent } from './dialogs-add-resources.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    ResourcesSharedModule
  ],
  exports: [
    DialogsAddResourcesComponent
  ],
  declarations: [
    DialogsAddResourcesComponent
  ]
})
export class DialogsAddResourcesModule {}
