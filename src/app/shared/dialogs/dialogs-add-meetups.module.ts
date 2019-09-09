import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetupsModule } from '../../meetups/meetups.module';
import { DialogsAddMeetupsComponent } from './dialogs-add-meetups.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    MeetupsModule
  ],
  exports: [
    DialogsAddMeetupsComponent
  ],
  declarations: [
    DialogsAddMeetupsComponent
  ],
  entryComponents: [
    DialogsAddMeetupsComponent
  ]
})
export class DialogsAddMeetupsModule {}
