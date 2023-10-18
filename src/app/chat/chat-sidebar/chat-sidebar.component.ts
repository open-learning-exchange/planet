import { Component, OnInit } from '@angular/core';
import { ChatService } from '../../shared/chat.service';

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: [ './chat-sidebar.scss' ],
})
export class ChatSidebarComponent implements OnInit {
  conversations: any;
  // conversationId: any;

  constructor(private chatService: ChatService) {}

  ngOnInit() {
    this.getChatHistory();
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
    this.chatService.setSelectedConversationId(conversation?._id);
    // this.conversationId = conversation?._id;
  }
}
