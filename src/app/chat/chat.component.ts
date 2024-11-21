import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatService } from '../shared/chat.service';
import { AIProvider } from './chat.model';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent implements OnInit {
  activeService: string;
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
      this.activeService = this.aiServices[0]?.model;
      this.displayToggle = this.aiServices.length > 0;
      this.chatService.toggleAIServiceSignal(this.activeService);
    });
    this.subscribeToAIService();
  }

  subscribeToAIService() {
    this.chatService.currentChatAIProvider$
      .subscribe((aiService => {
        console.log('log chat component: ', aiService);
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
    this.chatService.toggleAIServiceSignal(this.activeService);
  }

}
