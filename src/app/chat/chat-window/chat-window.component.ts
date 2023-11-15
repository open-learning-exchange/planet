import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CustomValidators } from '../../validators/custom-validators';
import { ChatService } from '../../shared/chat.service';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { showFormErrors } from '../../shared/table-helpers';

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: [ './chat-window.scss' ],
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  spinnerOn = true;
  setStreamOn = true;
  disabled = false;
  conversations: any[] = [];
  selectedConversationId: any;
  promptForm: FormGroup;
  data = {
    user: this.userService.get(),
    time: this.couchService.datePlaceholder,
    content: '',
    _id: '',
    _rev: ''
  };

  @ViewChild('chat') chatContainer: ElementRef;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
    private couchService: CouchService,
    private formBuilder: FormBuilder,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.createForm();
    this.subscribeToNewChatSelected();
    this.subscribeToSelectedConversation();
    this.initializeChatStream();
    this.initializeErrorStream();
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
      });
  }

  subscribeToSelectedConversation() {
    this.chatService.selectedConversationId$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((conversationId) => {
        this.selectedConversationId = conversationId;
        this.fetchConversation(this.selectedConversationId?._id);
      });
  }

  createForm() {
    this.promptForm = this.formBuilder.group({
      prompt: [ '', CustomValidators.required ],
    });
  }

  fetchConversation(id) {
    if (id) {
      this.chatService.findConversations([ id ], {}).subscribe(
        (conversation: Object) => {
          const messages = conversation[0]?.conversations;

          this.conversations = messages;
        }
      );
    }
  }

  scrollToBottom(): void {
    this.chatContainer.nativeElement.scrollTo({
      top: this.chatContainer.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
  }

  setSelectedConversation() {
    if (this.selectedConversationId) {
      this.data._id = this.selectedConversationId._id;
      this.data._rev = this.selectedConversationId._rev;
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
      this.handleIncomingMessage(message);
    });
  }

  handleIncomingMessage(message: string) {
    if (message === '[DONE]') {
      this.disabled = false;
    } else {
      this.disabled = true;
      this.spinnerOn = false;
      const lastConversation = this.conversations[this.conversations.length - 1];
      lastConversation.response += message;
      this.postSubmit();
    }
  }

  postSubmit() {
    this.changeDetectorRef.detectChanges();
    this.spinnerOn = true;
    this.scrollToBottom();
    this.promptForm.controls['prompt'].setValue('');
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
    this.data.content = content;
    this.setSelectedConversation();

    if (this.setStreamOn) {
      this.conversations.push({ role: 'user', query: content, response: '' });
      this.chatService.sendUserInput(content);
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
          this.spinnerOn = false;
          this.conversations.push({ query: content, response: 'Error: ' + error.message, error: true });
          this.postSubmit();
        }
      );
    }
  }
}
