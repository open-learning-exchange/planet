import { MaterialModule } from '../material.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersModule } from '../../users/users.module';
import { DialogsAddUsersComponent } from './dialogs-add-users.component';


@NgModule({
  imports: [
    CommonModule,
    MaterialModule,
    UsersModule
  ],
  exports: [
    DialogsAddUsersComponent
  ],
  declarations: [
    DialogsAddUsersComponent
  ],
  entryComponents: [
    DialogsAddUsersComponent
  ]
})
export class DialogsAddUsersModule {}
