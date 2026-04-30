import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatService } from '../shared/chat.service';
import { AIProvider, ProviderName } from './chat.model';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { NgIf, NgFor } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/autocomplete';
import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.scss'],
  imports: [MatToolbar, MatIconButton, MatIcon, NgIf, MatFormField, MatSelect, FormsModule, NgFor, MatOption, ChatSidebarComponent]
})
export class ChatComponent implements OnInit {
  activeService?: ProviderName;
  aiServices: AIProvider[] = [];
  displayToggle: boolean;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.chatService.listAIProviders().subscribe((providers) => {
      this.aiServices = providers;
      this.activeService = this.aiServices[0]?.name;
      this.displayToggle = this.aiServices.length > 0;
      if (this.activeService) {
        this.chatService.toggleAIServiceSignal(this.activeService);
      }
    });
    this.subscribeToAIService();
  }

  subscribeToAIService() {
    this.chatService.currentChatAIProvider$
      .subscribe((aiService => {
        if (aiService) {
          this.activeService = aiService.name;
          this.toggleAIService();
        }
      }));
  }

  goBack(): void {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

  toggleAIService(): void {
    if (this.activeService) {
      this.chatService.toggleAIServiceSignal(this.activeService);
    }
  }

}
