import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { DialogsChatShareModule } from '../shared/dialogs/dialogs-chat-share.module';

import { ChatComponent } from './chat.component';
import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from './chat-window/chat-window.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    PlanetFormsModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    DialogsChatShareModule,
  ],
  declarations: [
    ChatComponent,
    ChatSidebarComponent,
    ChatWindowComponent
  ],
  exports: [ ChatComponent ]
})
export class ChatModule {}
