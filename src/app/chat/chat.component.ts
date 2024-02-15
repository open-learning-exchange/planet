import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatService } from '../shared/chat.service';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent {
  aiService: 'openai' | 'perplexity';
  displayToggle: boolean;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.chatService.fetchAIProviders().subscribe((providers: {openai: any; perplexity: any}) => {
      console.log(providers);

      this.displayToggle = providers?.openai === true && providers?.perplexity === true;
      if(providers.openai === true) {
        this.aiService = 'openai';
        console.log('set openai');

      } else if(providers.perplexity === true) {
        this.aiService = 'perplexity';
        console.log('set perplexity');

      }
    });
    console.log(this.aiService);

  }

  goBack(): void {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

  toggleAIService(): void {
    this.chatService.toggleAIServiceSignal(this.aiService);
  }

}
