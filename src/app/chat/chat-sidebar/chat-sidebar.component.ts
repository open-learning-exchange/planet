import { Component, OnInit } from '@angular/core';
import { ChatService } from '../../shared/chat.service';

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: [ './chat-sidebar.scss' ],
})
export class ChatSidebarComponent implements OnInit {
  chats: any;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.getChatHistory();
  }

  getChatHistory() {
    this.chatService.findChats([], {}).subscribe(
      (chats) => {
        this.chats = chats;
      },
      (error) => console.log(error)
    );
  }
}
