import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, AbstractControl } from '@angular/forms';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Conversation, AIProvider } from '../chat.model';
import { ChatService } from '../../shared/chat.service';
import { CouchService } from '../../shared/couchdb.service';
import { DeviceInfoService, DeviceType } from '../../shared/device-info.service';
import { DialogsChatShareComponent } from '../../shared/dialogs/dialogs-chat-share.component';
import { SearchService } from '../../shared/forms/search.service';
import { showFormErrors, trackById } from '../../shared/table-helpers';
import { UserService } from '../../shared/user.service';

interface TitleForm {
  title: FormControl<string>;
  [key: string]: AbstractControl<any, any>;
}

@Component({
  selector: 'planet-chat-sidebar',
  templateUrl: './chat-sidebar.component.html',
  styleUrls: [ './chat-sidebar.scss' ],
})
export class ChatSidebarComponent implements OnInit, OnDestroy {
  readonly dbName = 'chat_history';
  private onDestroy$ = new Subject<void>();
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch.trim(); }
  set titleSearch(value: string) {
    this._titleSearch = value;
    this.recordSearch();
    this.filterConversations();
  }
  conversations: Conversation[];
  filteredConversations: Conversation[];
  selectedConversation: Conversation;
  lastRenderedConversation: number;
  isEditing: boolean;
  provider: AIProvider;
  fullTextSearch = false;
  searchType: 'questions' | 'responses';
  overlayOpen = false;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  titleForm: { [key: string]: FormGroup<TitleForm> } = {};
  trackByFn = trackById;

  constructor(
    private chatService: ChatService,
    private couchService: CouchService,
    private deviceInfoService: DeviceInfoService,
    private dialog: MatDialog,
    private formBuilder: FormBuilder,
    private searchService: SearchService,
    private userService: UserService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    this.titleSearch = '';
    this.getChatHistory();
    this.subscribeToNewChats();
    this.subscribeToAIService();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.recordSearch(true);
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  subscribeToNewChats() {
    this.chatService.newChatAdded$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => this.getChatHistory(true));
  }

  subscribeToAIService() {
    this.chatService.toggleAIService$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((aiService => {
        this.provider = {
          name: aiService
        };
        this.hasProviderChanged();
      }));
  }

  newChat() {
    this.chatService.sendNewChatSelectedSignal();
    this.chatService.setChatAIProvider(undefined);
    this.selectedConversation = null;
  }

  hasProviderChanged() {
    const currentProvider = this.chatService.getChatAIProvider();
    if (!currentProvider) {
      // That means it's a brand-new chat
      return;
    }
    if (currentProvider.name === this.provider.name) {
      // That means the same model is still being used
      return;
    }
    this.newChat();
  }

  toggleEditTitle() {
    this.isEditing = !this.isEditing;
  }

  toggleOverlay() {
    this.overlayOpen = !this.overlayOpen;
  }

  updateConversation(conversation: Conversation, title?: string, shared?: boolean) {
    this.couchService.updateDocument(
      this.dbName, {
        ...conversation,
        title: title !== undefined && title !== null ? title : conversation.title,
        shared: shared,
        updatedDate: this.couchService.datePlaceholder
      }
    ).subscribe((data) => {
      this.getChatHistory();
      return data;
    });
  }

  submitTitle(conversation: Conversation) {
    if (this.titleForm[conversation._id].valid) {
      const title = this.titleForm[conversation._id].controls.title.value;
      this.updateConversation(conversation, title);
      this.toggleEditTitle();
    } else {
      showFormErrors(this.titleForm[conversation._id].controls);
    }
  }

  initializeFormGroups() {
    this.conversations.forEach((conversation: Conversation) => {
      this.titleForm[conversation._id] = this.formBuilder.nonNullable.group({
        title: [ conversation?.title ?? '', Validators.required ]
      });
    });
  }

  getChatHistory(newChat: boolean = false) {
    this.chatService
      .findConversations([], [ this.userService.get().name ])
      .subscribe(
        (conversations: any) => {
          this.conversations = conversations
            .filter((conversation) => {
              const context = conversation?.context;

              if (!context) {
                return true;
              }

              if (typeof context === 'object' && context?.type === 'global') {
                return true;
              }

              return false;
            })
            .sort((a, b) => {
              const dateA = a.updatedDate || a.createdDate;
              const dateB = b.updatedDate || b.createdDate;

              return dateB - dateA;
            });
          this.filteredConversations = [ ...this.conversations ];
          if (newChat) {
            this.selectConversation(this.filteredConversations[0], 0);
          }
          this.initializeFormGroups();
        },
        (error) => console.log(error)
      );
  }

  selectConversation(conversation, index: number) {
    this.selectedConversation = conversation;
    const aiProvider: AIProvider = {
      name: this.selectedConversation['aiProvider'],
    };
    this.chatService.setChatAIProvider(aiProvider);
    const currentProvider = this.chatService.getChatAIProvider();
    this.chatService.setSelectedConversationId({
      '_id': conversation?._id,
      '_rev': conversation?._rev
    });
    this.onConversationRender(index);
  }

  onConversationRender(index: number) {
    if (index !== this.lastRenderedConversation) {
      this.isEditing = false;
    }
    this.lastRenderedConversation = index;
  }

  onSearchChange(searchValue: string) {
    this.titleSearch = searchValue;
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

  matchesSearchTerm(value: string, searchTerm: string): boolean {
    return value?.toLowerCase().includes(searchTerm.toLowerCase());
  }

  filterByTitle(conversation: Conversation): boolean {
    return this.matchesSearchTerm(conversation.title, this.titleSearch);
  }

  filterByFullText(conversation: Conversation): boolean {
    return conversation.conversations.some(chat => {
      const queryMatch = this.matchesSearchTerm(chat.query, this.titleSearch);
      const responseMatch = this.matchesSearchTerm(chat.response, this.titleSearch);
      if (this.searchType === 'questions') {
        return queryMatch;
      } else if (this.searchType === 'responses') {
        return responseMatch;
      } else {
        return queryMatch || responseMatch;
      }
    });
  }

  filterConversations() {
    if (this.titleSearch.trim() === '' ) {
      this.getChatHistory();
    }
    this.filteredConversations = this.conversations?.filter(conversation => {
      if (this.fullTextSearch) {
        return this.filterByFullText(conversation);
      }
      return this.filterByTitle(conversation);
    });
  }

  openShareDialog(conversation) {
    const dialogRef = this.dialog.open(DialogsChatShareComponent, {
      width: '50vw',
      maxHeight: '90vh',
      data: {
        news: conversation,
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.updateConversation(conversation, null, true);
      }
    });
  }
}
