import { Component, Input } from '@angular/core';

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: [ './chat-sidebar.component.scss' ],
})
export class ChatSidebarComponent {
  @Input() chats: any[];
}
