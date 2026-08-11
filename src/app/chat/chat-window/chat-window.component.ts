import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, AfterViewInit } from '@angular/core';
import { NonNullableFormBuilder, FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CustomValidators } from '../../validators/custom-validators';
import { ConversationForm, AIProvider, ChatContext, hasSearchableAttachments } from '../chat.model';
import { ChatService } from '../../shared/chat.service';
import { showFormErrors, trackByIdVal } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { NgClass } from '@angular/common';
import { ChatOutputDirective } from '../../shared/chat-output.directive';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { SubmitDirective } from '../../shared/submit.directive';
import { MatIcon } from '@angular/material/icon';

type PromptFormGroup = FormGroup<{ prompt: FormControl<string> }>;

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: ['./chat-window.scss'],
  imports: [
    ChatOutputDirective,
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
  @Input() context?: ChatContext;
  @Input() isEditing: boolean;
  @Input() conversations: any[] | null = null;
  @ViewChild('chatInput') chatInput: ElementRef;
  @ViewChild('chat') chatContainer: ElementRef;
  private onDestroy$ = new Subject<void>();
  private pendingStreamingTurnId?: string;
  spinnerOn = true;
  streaming: boolean;
  streamingPending = false;
  clearChat = true;
  provider: AIProvider;
  readonly attachedResourceLabel = $localize`Attached resource`;
  selectedConversationId: any;
  promptForm: PromptFormGroup;
  data: ConversationForm = {
    user: this.userService.get().name,
    content: '',
    mode: 'general_chat',
    context: '',
  };
  providers: AIProvider[] = [];
  trackByFn = trackByIdVal;

  constructor(
    private chatService: ChatService,
    private fb: NonNullableFormBuilder,
    private stateService: StateService,
    private userService: UserService
  ) {}

  ngOnInit() {
    if (this.conversations === null) {
      this.conversations = [];
    }
    this.createForm();
    this.subscribeToNewChatSelected();
    this.subscribeToSelectedConversation();
    this.subscribeToAIService();
    this.checkStreamingStatusAndInitialize();
    this.chatService.listAIProviders().pipe(takeUntil(this.onDestroy$)).subscribe((providers) => {
      this.providers = providers;
    });
  }

  ngAfterViewInit() {
    this.focusInput();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.chatService.closeWebSocket();
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
        })
      )
      .subscribe((conversationId) => {
        this.cancelPendingStreamingTurn();
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
    this.cancelPendingStreamingTurn();
    this.conversations = [];
    this.selectedConversationId = null;
  }

  private cancelPendingStreamingTurn() {
    if (!this.streamingPending) {
      return;
    }
    this.chatService.closeWebSocket();
    this.pendingStreamingTurnId = undefined;
    this.streamingPending = false;
  }

  createForm() {
    this.promptForm = this.fb.group({
      prompt: this.fb.control('', { validators: [ CustomValidators.required ] }),
    });
  }

  fetchConversation(id) {
    if (id) {
      try {
        this.chatService.findConversations([ id ]).subscribe(
          (conversation: object) => {
            const messages = conversation[0]?.conversations;
            this.conversations = messages || [];
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

  checkStreamingStatusAndInitialize() {
    this.isStreamingEnabled();
    if (this.streaming) {
      this.initializeChatStream();
      this.initializeErrorStream();
    }
  }

  isStreamingEnabled() {
    const configuration = this.stateService.configuration;
    this.streaming = configuration.streaming;
  }

  initializeErrorStream() {
    this.chatService.getErrorStream().pipe(takeUntil(this.onDestroy$)).subscribe((errorMessage) => {
      const pendingIndex = this.pendingStreamingTurnId
        ? this.conversations.findIndex((conversation) => conversation.id === this.pendingStreamingTurnId)
        : -1;
      if (pendingIndex >= 0) {
        const pendingConversation = this.conversations[pendingIndex];
        const partialResponse = pendingConversation.response?.trim();
        this.conversations[pendingIndex] = {
          ...pendingConversation,
          response: partialResponse
            ? `${partialResponse}\n\nError: ${errorMessage}`
            : 'Error: ' + errorMessage,
          error: true
        };
        this.promptForm.controls.prompt.setValue('');
      }
      this.pendingStreamingTurnId = undefined;
      this.streamingPending = false;
      this.spinnerOn = true;
    });
  }

  initializeChatStream() {
    // Subscribe to WebSocket messages
    this.chatService.getChatStream().pipe(takeUntil(this.onDestroy$)).subscribe((message) => {
      // Handle incoming messages from the chat stream
      this.handleIncomingMessage(JSON.parse(message));
    });
  }

  handleIncomingMessage(message: any) {
    const pendingConversation = this.pendingStreamingTurnId
      ? this.conversations.find((conversation) => conversation.id === this.pendingStreamingTurnId)
      : undefined;
    if (!pendingConversation) {
      return;
    }
    if (message.type === 'final') {
      this.selectedConversationId = {
        _id: message.couchDBResponse?.id,
        _rev: message.couchDBResponse?.rev
      };
      if (message.citations?.length) {
        pendingConversation.citations = message.citations;
      }
      this.pendingStreamingTurnId = undefined;
      this.streamingPending = false;
      this.postSubmit();
    } else {
      this.spinnerOn = false;
      pendingConversation.response += message.response;
      this.scrollTo('bottom');
    }
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
    const contextHasAttachments = hasSearchableAttachments(this.context?.resource?.attachments);
    const attachmentProvider = contextHasAttachments
      ? this.providers.find((provider) => provider.capabilities?.includes('fileSearch'))
      : undefined;
    const selectedProvider = attachmentProvider || this.provider || this.chatService.getChatAIProvider() || this.providers[0];
    if (!selectedProvider) {
      return;
    }
    this.data = {
      ...this.data,
      content,
      aiProvider: selectedProvider,
      mode: this.context?.type === 'coursestep' ? 'course_help' : 'general_chat'
    };

    // Attachment capability is a turn-level course requirement, not a change to
    // the learner's provider preference for general chat.
    if (!attachmentProvider) {
      this.chatService.setChatAIProvider(selectedProvider);
    }
    this.setSelectedConversation();

    if (this.context) {
      this.data.context = this.context;
    } else {
      // this.data is reused across turns; don't let an old course/resource context leak
      this.data.context = '';
    }

    if (this.streaming) {
      const turnId = Date.now().toString();
      this.pendingStreamingTurnId = turnId;
      this.streamingPending = true;
      this.conversations.push({ id: turnId, role: 'user', query: content, response: '' });
      this.chatService.sendUserInput(this.data);
    } else {
      this.chatService.getPrompt(this.data, true).subscribe(
        (completion: any) => {
          this.conversations.push({
            id: Date.now().toString(), query: content, response: completion?.chat, citations: completion?.citations
          });
          this.selectedConversationId = {
            _id: completion.couchDBResponse?.id,
            _rev: completion.couchDBResponse?.rev
          };
          this.postSubmit();
        },
        (error: any) => {
          const errorMessage = this.chatService.chatErrorMessage(error.error, error.message);
          this.conversations.push({ id: Date.now().toString(), query: content, response: 'Error: ' + errorMessage, error: true });
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
