import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatService } from '../../shared/chat.service';
import { CouchService } from '../../shared/couchdb.service';
import { showFormErrors } from '../../shared/table-helpers';

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: [ './chat-sidebar.scss' ],
})
export class ChatSidebarComponent implements OnInit, OnDestroy {
  readonly dbName = 'chat_history';
  private onDestroy$ = new Subject<void>();
  conversations: any;
  selectedConversation: any;
  isEditing: boolean;
  titleForm: { [key: string]: FormGroup } = {};

  constructor(
    private chatService: ChatService,
    private couchService: CouchService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.getChatHistory();
    this.subscribeToNewChats();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  subscribeToNewChats() {
    this.chatService.newChatAdded$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => this.getChatHistory());
  }

  newChat() {
    this.chatService.sendNewChatSelectedSignal();
    this.selectedConversation = null;
  }

  toggleEditTitle() {
    this.isEditing = !this.isEditing;
  }

  updateConversation(conversation, title) {
    this.couchService.updateDocument(
      this.dbName, { ...conversation, title: title, updatedTime: this.couchService.datePlaceholder }
    ).subscribe((data) => {
      this.getChatHistory();
      return data;
    });
  }

  submitTitle(conversation) {
    if (this.titleForm[conversation._id].valid) {
      const title = this.titleForm[conversation._id].get('title').value;
      this.updateConversation(conversation, title);
      this.toggleEditTitle();
    } else {
      showFormErrors(this.titleForm[conversation._id].controls);
    }
  }

  initializeFormGroups() {
    this.conversations.forEach((conversation) => {
      this.titleForm[conversation._id] = this.formBuilder.group({
        title: [ conversation?.title, Validators.required ]
      });
    });
  }

  getChatHistory() {
    this.chatService.findConversations([], {}).subscribe(
      (conversations) => {
        this.conversations = conversations;
        this.initializeFormGroups();
      },
      (error) => console.log(error)
    );
  }

  selectConversation(conversation) {
    this.selectedConversation = conversation;
    this.chatService.setSelectedConversationId({
      '_id': conversation?._id,
      '_rev': conversation?._rev
    });
  }
}
