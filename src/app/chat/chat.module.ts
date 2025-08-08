import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MaterialModule } from '../shared/material.module';
import { PlanetFormsModule } from '../shared/forms/planet-forms.module';
import { SharedComponentsModule } from '../shared/shared-components.module';
import { ChatRouterModule } from './chat-routing.module';
import { TeamsModule } from '../teams/teams.module';
import { ChatComponent } from './chat.component';
import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';
import { ChatWindowComponent } from './chat-window/chat-window.component';
import { DialogsChatShareComponent } from '../shared/dialogs/dialogs-chat-share.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    PlanetFormsModule,
    ReactiveFormsModule,
    SharedComponentsModule,
    ChatRouterModule,
    TeamsModule
  ],
  declarations: [
    ChatComponent,
    ChatSidebarComponent,
    ChatWindowComponent,
    DialogsChatShareComponent
  ],
  exports: [ ChatWindowComponent, ChatComponent ]
})
export class ChatModule {}
