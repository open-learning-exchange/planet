import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeetupsModule } from '../../meetups/meetups.module';
import { DialogsChatShareComponent } from './dialogs-chat-share.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    MeetupsModule
  ],
  exports: [
    DialogsChatShareComponent
  ],
  declarations: [
    DialogsChatShareComponent
  ]
})
export class DialogsChatShareModule {}
