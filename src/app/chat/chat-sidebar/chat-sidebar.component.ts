import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ChatService } from '../../shared/chat.service';
import { CouchService } from '../../shared/couchdb.service';
import { SearchService } from '../../shared/forms/search.service';
import { showFormErrors } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';

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
  fullTextSearch = false;
  searchType: 'questions' | 'responses';
  overlayOpen = false;
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
    private formBuilder: FormBuilder,
    private searchService: SearchService,
    private userService: UserService
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

  toggleOverlay() {
    this.overlayOpen = !this.overlayOpen;
  }

  updateConversation(conversation, title) {
    this.couchService.updateDocument(
      this.dbName, { ...conversation, title: title, updatedDate: this.couchService.datePlaceholder }
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
    this.chatService.findConversations([], [ this.userService.get().name ]).subscribe(
      (conversations: any) => {
        this.conversations = conversations.sort((a, b) => b.createdDate - a.createdDate);
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
    this.searchType = null;
  }

  recordSearch(complete = false) {
    this.searchService.recordSearch({
      type: this.dbName,
      filter: { 'title': this.titleSearch }
    }, complete);
  }

  toggleSearchType() {
    this.fullTextSearch = !this.fullTextSearch;
    this.filterConversations();
  }

  filterConversations() {
    if (this.titleSearch.trim() === '' ) {
      this.getChatHistory();
    }

    this.filteredConversations = this.conversations?.filter(conversation => {
      if (this.fullTextSearch) {
        const conversationMatches = conversation.conversations.some(chat => {
          const queryMatch = chat.query?.toLowerCase().includes(this.titleSearch.toLowerCase());
          const responseMatch = chat.response?.toLowerCase().includes(this.titleSearch.toLowerCase());
          if (this.searchType === 'questions') {
            return queryMatch;
          } else if (this.searchType === 'responses') {
            return responseMatch;
          } else {
            return queryMatch || responseMatch;
          }
        });
        return conversationMatches;
      }

      return conversation.title?.toLowerCase().includes(this.titleSearch.toLowerCase());
    });
  }
}
