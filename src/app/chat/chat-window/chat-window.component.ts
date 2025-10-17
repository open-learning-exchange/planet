import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, Input, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CustomValidators } from '../../validators/custom-validators';
import { ConversationForm, AIProvider } from '../chat.model';
import { ChatService } from '../../shared/chat.service';
import { showFormErrors, trackByIdVal } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';

interface PromptForm {
  prompt: FormControl<string>;
  [key: string]: AbstractControl<any, any>;
}

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
  promptForm: FormGroup<PromptForm>;
  data: ConversationForm = {
    _id: '',
    _rev: '',
    user: this.userService.get().name,
    content: '',
    aiProvider: { name: 'openai' },
    context: {
      data: '',
      resource: null
    },
  };
  providers: AIProvider[] = [];
  trackByFn = trackByIdVal;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
    private formBuilder: FormBuilder,
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
        filter(() => {
          if (this.clearChat) {
            this.clearChat = false;
            return false;
          }
          return true;
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
    this.promptForm = this.formBuilder.nonNullable.group({
      prompt: [ '', CustomValidators.required ],
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
      this.postSubmit();
    } else {
      this.spinnerOn = false;
      const lastConversation = this.conversations[this.conversations.length - 1];
      lastConversation.response += message.response;
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
    this.data = { ...this.data, content, aiProvider: this.provider };

    this.chatService.setChatAIProvider(this.data.aiProvider);
    this.setSelectedConversation();

    if (this.context) {
      this.data.context = this.context;
    }

    if (this.streaming) {
      this.conversations.push({ id: Date.now().toString(), role: 'user', query: content, response: '' });
      this.chatService.sendUserInput(this.data);
    } else {
      this.chatService.getPrompt(this.data, true).subscribe(
        (completion: any) => {
          this.conversations.push({ id: Date.now().toString(), query: content, response: completion?.chat });
          this.selectedConversationId = {
            '_id': completion.couchDBResponse?.id,
            '_rev': completion.couchDBResponse?.rev
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
