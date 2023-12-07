import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CustomValidators } from '../../validators/custom-validators';
import { ChatService } from '../../shared/chat.service';
import { CouchService } from '../../shared/couchdb.service';
import { showFormErrors } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: [ './chat-window.scss' ],
})
export class ChatWindowComponent implements OnInit, OnDestroy {
  private onDestroy$ = new Subject<void>();
  spinnerOn = true;
  conversations: any[] = [];
  selectedConversationId: any;
  promptForm: FormGroup;
  data = {
    user: this.userService.get().name,
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
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
      this.chatService.findConversations([ id ]).subscribe(
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
