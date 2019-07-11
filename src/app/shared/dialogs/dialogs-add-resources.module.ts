import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourcesModule } from '../../resources/resources.module';
import { DialogsAddResourcesComponent } from './dialogs-add-resources.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    ResourcesModule
  ],
  exports: [
    DialogsAddResourcesComponent
  ],
  declarations: [
    DialogsAddResourcesComponent
  ],
  entryComponents: [
    DialogsAddResourcesComponent
  ]
})
export class DialogsAddResourcesModule {}
