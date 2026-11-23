import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, Input, AfterViewInit } from '@angular/core';
import { NonNullableFormBuilder, FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NgClass } from '@angular/common';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

import { AiChatService } from '@shared/ai/ai-chat.service';
import { showFormErrors, trackByIdVal } from '@shared/tables/table.helpers';
import { UserService } from '@shared/auth/user.service';
import { StateService } from '@shared/state.service';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { SubmitDirective } from '@shared/dialogs/submit.directive';

import { CustomValidators } from '../../validators/custom-validators';
import { ConversationForm, AIProvider } from '../chat.model';

type PromptFormGroup = FormGroup<{ prompt: FormControl<string> }>;

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.scss'],
  imports: [
    PlanetMarkdownComponent,
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatIconButton,
    MatSuffix,
    MatTooltip,
    SubmitDirective,
    MatIcon
  ]
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() context: any;
  @Input() isEditing: boolean;
  @Input() conversations: any[] | null = null;
  @ViewChild('chatInput') chatInput: ElementRef;
  @ViewChild('chat') chatContainer: ElementRef;
  private onDestroy$ = new Subject<void>();
  private streamSubscription?: Subscription;
  spinnerOn = true;
  streaming: boolean;
  disabled = false;
  clearChat = true;
  provider: AIProvider;
  fallbackConversation: any[] = [];
  selectedConversationId: any;
  promptForm: PromptFormGroup;
  data: ConversationForm = {
    _id: '',
    _rev: '',
    user: this.userService.get().name,
    content: '',
    aiProvider: { name: 'openai' },
    context: '',
  };
  providers: AIProvider[] = [];
  trackByFn = trackByIdVal;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: AiChatService,
    private fb: NonNullableFormBuilder,
    private stateService: StateService,
    private userService: UserService
  ) {}

  ngOnInit() {
    if (this.conversations === null) {
      this.conversations = this.fallbackConversation;
    }
    this.createForm();
    this.subscribeToNewChatSelected();
    this.subscribeToSelectedConversation();
    this.subscribeToAIService();
    this.streaming = this.stateService.configuration.streaming;
    this.chatService.listAIProviders().subscribe((providers) => {
      this.providers = providers;
      if (!this.provider && providers.length > 0) {
        this.provider = { name: providers[0].name };
      }
    });
  }

  ngAfterViewInit() {
    this.focusInput();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.streamSubscription?.unsubscribe();
  }

  subscribeToNewChatSelected() {
    this.chatService.newChatSelected$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.resetConversation();
        this.focusInput();
      }, error => {
        console.error('Error subscribing to newChatSelected$', error);
      });
  }

  subscribeToSelectedConversation() {
    this.chatService.selectedConversationId$
      .pipe(
        takeUntil(this.onDestroy$),
        filter(() => {
          if (this.clearChat) {
            this.clearChat = false;
            return false;
          }
          return true;
        }),
        filter((conversation: any) => conversation?._id !== this.selectedConversationId?._id)
      )
      .subscribe((conversationId) => {
        this.stopStreaming();
        this.selectedConversationId = conversationId;
        this.fetchConversation(this.selectedConversationId?._id);
        if (!this.isEditing) {
          this.focusInput();
        }
      }, error => {
        console.error('Error subscribing to selectedConversationId$', error);
      });
  }

  subscribeToAIService() {
    this.chatService.toggleAIService$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((aiService => {
        this.provider = {
          name: aiService
        };
        if (!this.isEditing) {
          this.focusInput();
        }
      }));
  }

  resetConversation() {
    this.stopStreaming();
    this.conversations = [];
    this.selectedConversationId = null;
  }

  createForm() {
    this.promptForm = this.fb.group({
      prompt: this.fb.control('', { validators: [ CustomValidators.required ] }),
    });
  }

  fetchConversation(id) {
    if (id) {
      try {
        this.chatService.getConversation(id).subscribe(
          (conversation) => {
            this.conversations = conversation.conversations;
          }
        );
      } catch (error) {
        console.error('Error fetching conversation: ', error);
      }
    }
  }

  scrollTo(position: 'top' | 'bottom'): void {
    const target = position === 'top' ? 0 : this.chatContainer.nativeElement.scrollHeight;
    this.chatContainer.nativeElement.scrollTo({
      top: target,
      behavior: 'smooth',
    });
  }

  setSelectedConversation(): void {
    if (this.selectedConversationId) {
      this.data = {
        ...this.data,
        _id: this.selectedConversationId._id,
        _rev: this.selectedConversationId._rev,
      };
    } else {
      delete this.data._id;
      delete this.data._rev;
    }
  }

  stopStreaming() {
    this.streamSubscription?.unsubscribe();
    this.spinnerOn = true;
  }

  streamTurn(content: string) {
    const turn = { id: Date.now().toString(), role: 'user', query: content, response: '', error: false };
    this.conversations.push(turn);
    this.streamSubscription = this.chatService.streamPrompt(this.data).subscribe({
      next: (message) => {
        if (message.type === 'final') {
          this.selectedConversationId = { _id: message.couchDBResponse.id, _rev: message.couchDBResponse.rev };
          this.postSubmit();
        } else {
          this.spinnerOn = false;
          turn.response += message.response;
          this.scrollTo('bottom');
        }
      },
      error: (error: Error) => {
        turn.response = `${turn.response}\n\nError: ${error.message}`.trim();
        turn.error = true;
        this.spinnerOn = true;
        this.promptForm.controls.prompt.setValue('');
      }
    });
  }

  postSubmit() {
    this.spinnerOn = true;
    this.promptForm.controls.prompt.setValue('');
    this.chatService.sendNewChatAddedSignal();
  }

  onSubmit() {
    if (this.promptForm.valid) {
      this.submitPrompt();
    } else {
      showFormErrors(this.promptForm.controls);
    }
  }

  submitPrompt() {
    const content = this.promptForm.controls.prompt.value;
    this.data = { ...this.data, content, aiProvider: this.provider };

    this.chatService.setChatAIProvider(this.data.aiProvider);
    this.setSelectedConversation();

    if (this.context) {
      this.data.context = this.context;
    }

    if (this.streaming) {
      this.streamTurn(content);
    } else {
      this.chatService.getPrompt(this.data, true).subscribe(
        (completion: any) => {
          this.conversations.push({ id: Date.now().toString(), query: content, response: completion?.chat });
          this.selectedConversationId = {
            _id: completion.couchDBResponse?.id,
            _rev: completion.couchDBResponse?.rev
          };
          this.postSubmit();
        },
        (error: any) => {
          this.conversations.push({ id: Date.now().toString(), query: content, response: 'Error: ' + error.message, error: true });
          this.spinnerOn = true;
          this.promptForm.controls.prompt.setValue('');
        }
      );
    }
  }

  focusInput() {
    this.chatInput?.nativeElement.focus();
  }
}
