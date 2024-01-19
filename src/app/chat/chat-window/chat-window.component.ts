import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CustomValidators } from '../../validators/custom-validators';
import { ConversationForm } from '../chat.model';
import { ChatService } from '../../shared/chat.service';
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
  data: ConversationForm = {
    _id: '',
    _rev: '',
    user: this.userService.get().name,
    content: ''
  };

  @ViewChild('chat') chatContainer: ElementRef;

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
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

  postSubmit() {
    this.changeDetectorRef.detectChanges();
    this.spinnerOn = true;
    this.scrollTo('bottom');
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
    this.data = { ...this.data, content };

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
