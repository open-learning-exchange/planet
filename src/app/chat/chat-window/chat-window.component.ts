import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CustomValidators } from '../../validators/custom-validators';
import { ConversationForm, AIProvider } from '../chat.model';
import { ChatService } from '../../shared/chat.service';
import { showFormErrors } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: [ './chat-window.scss' ],
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  spinnerOn = true;
  streaming: boolean;
  disabled = false;
  provider: AIProvider;
  conversations: any[] = [];
  selectedConversationId: any;
  promptForm: FormGroup;
  data: ConversationForm = {
    _id: '',
    _rev: '',
    user: this.userService.get().name,
    content: '',
    aiProvider: { name: 'openai' },
  };

  @ViewChild('chat') chatContainer: ElementRef;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
    private formBuilder: FormBuilder,
    private stateService: StateService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.createForm();
    this.subscribeToNewChatSelected();
    this.subscribeToSelectedConversation();
    this.initializeChatStream();
    this.initializeErrorStream();
    this.subscribeToAIService();
    this.isStreamingEnabled();
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
        this.selectedConversationId = null;
        this.conversations = [];
      }, error => {
        console.error('Error subscribing to newChatSelected$', error);
      });
  }

  subscribeToSelectedConversation() {
    this.chatService.selectedConversationId$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((conversationId) => {
        this.selectedConversationId = conversationId;
        this.fetchConversation(this.selectedConversationId?._id);
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
      }));
  }

  isStreamingEnabled() {
    const configuration = this.stateService.configuration;
    this.streaming = configuration.streaming;
  }

  createForm() {
    this.promptForm = this.formBuilder.group({
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

  initializeErrorStream() {
    // Subscribe to WebSocket error messages
    this.chatService.getErrorStream().subscribe((errorMessage) => {
      this.conversations.push({
        query: errorMessage,
        response: 'Error: ' + errorMessage,
        error: true,
      });
      this.postSubmit();
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
    } else {
      this.spinnerOn = false;
      const lastConversation = this.conversations[this.conversations.length - 1];
      lastConversation.response += message.response;
      this.postSubmit();
    }
  }

  postSubmit() {
    this.changeDetectorRef.detectChanges();
    this.spinnerOn = true;
    this.scrollTo('bottom');
    this.promptForm.controls['prompt'].setValue('');
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
    const content = this.promptForm.get('prompt').value;
    this.data = { ...this.data, content, aiProvider: this.provider };

    this.setSelectedConversation();

    if (this.streaming) {
      this.conversations.push({ role: 'user', query: content, response: '' });
      this.chatService.sendUserInput(this.data);
    } else {
      this.chatService.getPrompt(this.data, true).subscribe(
        (completion: any) => {
          this.conversations.push({ query: content, response: completion?.chat });
          this.selectedConversationId = {
            '_id': completion.couchDBResponse?.id,
            '_rev': completion.couchDBResponse?.rev
          };
          this.postSubmit();
          this.chatService.sendNewChatAddedSignal();
        },
        (error: any) => {
          this.conversations.push({ query: content, response: 'Error: ' + error.message, error: true });
          this.postSubmit();
        }
      );
    }
  }
}
