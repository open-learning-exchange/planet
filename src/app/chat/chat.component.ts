import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ChatService } from '../shared/chat.service';
import { AIServices } from './chat.model';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent implements OnInit {
  aiService: 'openai' | 'perplexity';
  displayToggle: boolean;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.chatService.fetchAIProviders().pipe(
      catchError(err => {
        console.error(err);
        return of({ openai: false, perplexity: false });
      })
    ).subscribe((aiServices: AIServices) => {
      this.displayToggle = aiServices.openai && aiServices.perplexity;
      this.aiService = aiServices.openai ? 'openai' : 'perplexity';
    });
  }

  goBack(): void {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

  toggleAIService(): void {
    this.chatService.toggleAIServiceSignal(this.aiService);
  }

}
