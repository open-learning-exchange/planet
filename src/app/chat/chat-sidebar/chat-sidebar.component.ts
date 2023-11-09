import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatService } from '../../shared/chat.service';
import { CouchService } from '../../shared/couchdb.service';
import { SearchService } from '../../shared/forms/search.service';
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
  filteredConversations: any;
  selectedConversation: any;
  isEditing: boolean;
  titleForm: { [key: string]: FormGroup } = {};
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch.trim(); }
  set titleSearch(value: string) {
    this._titleSearch = value;
    this.recordSearch();
    this.filterConversations();
  }

  constructor(
    private chatService: ChatService,
    private couchService: CouchService,
    private searchService: SearchService,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit() {
    this.titleSearch = '';
    this.getChatHistory();
    this.subscribeToNewChats();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.recordSearch(true);
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
        this.filteredConversations = [ ...conversations ];
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

  onSearchChange() {
    this.titleSearch = this.titleSearch;
  }

  resetFilter() {
    this.titleSearch = '';
  }

  recordSearch(complete = false) {
    this.searchService.recordSearch({
      type: this.dbName,
      filter: { 'title': this.titleSearch }
    }, complete);
  }

  filterConversations() {
    if (this.titleSearch.trim() === '' ) {
      this.getChatHistory();
    } else {
      this.filteredConversations = this.conversations.filter(conversation => {
        const titleMatch = conversation.title?.toLowerCase().includes(this.titleSearch.toLowerCase());
        const initialQueryMatch = conversation.conversations[0].query?.toLowerCase().includes(
          this.titleSearch.toLowerCase()
        );

        return conversation.title ? titleMatch : initialQueryMatch;
      });
    }
  }
}
