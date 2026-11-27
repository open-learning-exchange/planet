import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

import { AiChatService } from '@shared/ai/ai-chat.service';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { TimeAgoPipe } from '@shared/text/time-ago.pipe';

import { SharedChat } from './chat.model';

@Component({
  templateUrl: './chat-shared.component.html',
  styleUrls: [ './chat-shared.component.scss' ],
  imports: [ MatIcon, PlanetMarkdownComponent, TimeAgoPipe ]
})
export class ChatSharedComponent implements OnInit {
  sharedChat?: SharedChat | null;
  loadFailed = false;

  constructor(
    private chatService: AiChatService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.chatService.getSharedChat(this.route.snapshot.paramMap.get('shareId')).subscribe({
      next: (sharedChat) => {
        this.sharedChat = sharedChat;
      },
      error: (error) => {
        this.sharedChat = null;
        this.loadFailed = error.status !== 404;
      }
    });
  }
}
