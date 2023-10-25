import { Component, OnInit } from '@angular/core';
import { ChatService } from '../../shared/chat.service';

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: [ './chat-sidebar.scss' ],
})
export class ChatSidebarComponent implements OnInit {
  conversations: any;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.getChatHistory();
  }

  newChat() {
    this.chatService.sendNewChatSignal();
  }

  getChatHistory() {
    this.chatService.findConversations([], {}).subscribe(
      (conversations) => {
        this.conversations = conversations;
      },
      (error) => console.log(error)
    );
  }

  selectConversation(conversation) {
    this.getChatHistory();
    this.chatService.setSelectedConversationId({
      '_id': conversation?._id,
      '_rev': conversation?._rev
    });
  }
}
