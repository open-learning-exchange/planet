import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, Input, AfterViewInit } from '@angular/core';
import { NonNullableFormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CustomValidators } from '../../validators/custom-validators';
import { ConversationForm, AIProvider } from '../chat.model';
import { ChatService } from '../../shared/chat.service';
import { showFormErrors, trackByIdVal } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';

type PromptFormGroup = FormGroup<{ prompt: FormControl<string> }>;

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: [ './chat-window.scss' ],
})
export class ChatWindowComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() context: any;
  @Input() isEditing: boolean;
  @Input() conversations: any[] | null = null;
  @ViewChild('chatInput') chatInput: ElementRef;
  @ViewChild('chat') chatContainer: ElementRef;
  private onDestroy$ = new Subject<void>();
  spinnerOn = true;
  streaming: boolean;
  disabled = false;
  clearChat = true;
  provider: AIProvider;
  fallbackConversation: any[] = [];
  selectedConversationId: any;
  promptForm: PromptFormGroup;
  pendingNewConversation = false;
  data: ConversationForm = {
    _id: '',
    _rev: '',
    user: this.userService.get().name,
    content: '',
    aiProvider: { name: 'openai' },
    assistant: true,
    context: '',
  };
  providers: AIProvider[] = [];
  trackByFn = trackByIdVal;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
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
    this.checkStreamingStatusAndInitialize();
    this.chatService.listAIProviders().subscribe((providers) => {
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
        filter((conversationId) => {
          // Only fetch if it's a different conversation or it's being explicitly cleared (null).
          // This prevents re-fetching the same conversation that we just updated locally.
          return (conversationId as any)?._id !== (this.selectedConversationId as any)?._id || conversationId === null;
        })
      )
      .subscribe((conversationId) => {
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
        this.chatService.findConversations([ id ]).subscribe(
          (conversation: Object) => {
            const messages = conversation[0]?.conversations;
            this.conversations = messages;
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
      this.chatService.initializeWebSocket();
      this.initializeChatStream();
      this.initializeErrorStream();
    }
  }

  isStreamingEnabled() {
    const configuration = this.stateService.configuration;
    this.streaming = configuration.streaming;
  }

  initializeErrorStream() {
    this.chatService.getErrorStream().subscribe((errorMessage) => {
      const lastConversation = this.conversations[this.conversations.length - 1];
      this.conversations[this.conversations.length - 1] = {
        ...lastConversation,
        response: 'Error: ' + errorMessage,
        error: true
      };
      this.spinnerOn = true;
      this.promptForm.controls.prompt.setValue('');
    });
  }

  initializeChatStream() {
    // Subscribe to WebSocket messages
    this.chatService.getChatStream().subscribe((message) => {
      // Handle incoming messages from the chat stream
      this.handleIncomingMessage(JSON.parse(message));
    });
  }

  handleIncomingMessage(message: any) {
    if (message.type === 'final') {
      this.selectedConversationId = {
        '_id': message.couchDBResponse?.id,
        '_rev': message.couchDBResponse?.rev
      };
      this.postSubmit(this.pendingNewConversation);
      this.pendingNewConversation = false;
    } else {
      this.spinnerOn = false;
      const lastConversation = this.conversations[this.conversations.length - 1];
      lastConversation.response += message.response;
      this.scrollTo('bottom');
    }
  }

  postSubmit(wasNewConversation: boolean = false) { // Add parameter
    this.spinnerOn = true;
    if (wasNewConversation) {
      this.chatService.sendNewChatAddedSignal(); // Notify sidebar only if a new conversation was created
    }
  }

  onSubmit() {
    if (this.promptForm.valid) {
      this.submitPrompt();
    } else {
      showFormErrors(this.promptForm.controls);
    }
  }

  submitPrompt() {
    const wasNewConversation = !this.selectedConversationId; // Store state before any changes

    const content = this.promptForm.controls.prompt.value;
    this.promptForm.controls.prompt.setValue(''); // Clear the input field

    if (wasNewConversation) {
      this.resetConversation(); // Clear local messages only when starting a new conversation
    }
    this.pendingNewConversation = wasNewConversation;
    // Add local message immediately
    this.conversations.push({ id: Date.now().toString(), role: 'user', query: content, response: '' });


    this.data = { ...this.data, content, aiProvider: this.provider };

    this.chatService.setChatAIProvider(this.data.aiProvider);
    this.setSelectedConversation();

    if (this.context) {
      this.data.context = this.context;
    }

    if (this.streaming) {
      this.chatService.sendUserInput(this.data);
    } else {
      const lastConversationIndex = this.conversations.length - 1;
      this.chatService.getPrompt(this.data, true).subscribe(
        (completion: any) => {
          this.conversations[lastConversationIndex].response = completion?.chat;
          this.selectedConversationId = {
            '_id': completion.couchDBResponse?.id,
            '_rev': completion.couchDBResponse?.rev,
          };
          this.postSubmit(wasNewConversation); // Pass the flag
        },
        (error: any) => {
          this.conversations[lastConversationIndex].response = 'Error: ' + error.message;
          this.conversations[lastConversationIndex].error = true;
          this.spinnerOn = true;
        },
      );
    }
  }

  focusInput() {
    this.chatInput?.nativeElement.focus();
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Mirror the send button's disabled condition so Enter doesn't bypass it
      const sendDisabled = !this.promptForm.valid || this.providers.length === 0 || this.disabled;
      if (!sendDisabled) {
        this.onSubmit();
      }
    }
  }
}