import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/autocomplete';
import { MatTooltip } from '@angular/material/tooltip';

import { AiChatService } from '@shared/ai/ai-chat.service';
import { TruncateTextPipe } from '@shared/text/truncate-text.pipe';

import { AIProvider, Conversation, ProviderName } from './chat.model';
import { ChatSidebarComponent } from './chat-sidebar/chat-sidebar.component';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.scss'],
  imports: [
    MatToolbar,
    MatIconButton,
    MatIcon,
    MatFormField,
    MatSelect,
    FormsModule,
    MatOption,
    MatTooltip,
    TruncateTextPipe,
    ChatSidebarComponent
  ]
})
export class ChatComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  activeService?: ProviderName;
  aiServices: AIProvider[] = [];
  displayToggle: boolean;
  selectedConversationTitle = '';

  constructor(
    private chatService: AiChatService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.chatService.listAIProviders()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((providers) => {
        this.aiServices = providers;
        this.activeService = this.aiServices[0]?.name;
        this.displayToggle = this.aiServices.length > 0;
        if (this.activeService) {
          this.chatService.toggleAIServiceSignal(this.activeService);
        }
      });
    this.subscribeToAIService();
    this.subscribeToSelectedConversation();
    this.selectedConversationTitle = '';
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  subscribeToAIService() {
    this.chatService.currentChatAIProvider$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((aiService => {
        if (aiService) {
          this.activeService = aiService.name;
          this.toggleAIService();
        }
      }));
  }

  subscribeToSelectedConversation() {
    this.chatService.selectedConversationId$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((conversation: Partial<Conversation> | null) => {
        this.selectedConversationTitle = conversation?.title ?? '';
      });
    this.chatService.newChatSelected$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.selectedConversationTitle = '';
      });
  }

  goBack(): void {
    const returnState = history.state?.returnState;
    if (returnState) {
      this.router.navigate([ `${returnState.route}` ]);
      return;
    }
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

  toggleAIService(): void {
    if (this.activeService) {
      this.chatService.toggleAIServiceSignal(this.activeService);
    }
  }

}
