import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatService } from '../shared/chat.service';
import { AIServices, ProviderName } from './chat.model';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.scss' ]
})
export class ChatComponent implements OnInit {
  activeService: string;
  aiServices: { name: ProviderName, value: ProviderName }[] = [];
  displayToggle: boolean;

  constructor(
    private chatService: ChatService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.chatService.listAIProviders().subscribe((services: AIServices | null) => {
      if (services) {
        for (const [ key, value ] of Object.entries(services)) {
          if (value === true) {
            this.aiServices.push({
              name: key as ProviderName,
              value: key as ProviderName
            });
          }
        }
        this.activeService = this.aiServices[0].value;
        this.displayToggle = this.aiServices.length > 0;
        this.chatService.toggleAIServiceSignal(this.activeService);
      }
    });
  }

  goBack(): void {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

  toggleAIService(): void {
    this.chatService.toggleAIServiceSignal(this.activeService);
  }

}
