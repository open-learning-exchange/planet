import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { showFormErrors } from '../../shared/table-helpers';
import { ChatService } from '../../shared/chat.service';
import { UserService } from '../../shared/user.service';
import { CouchService } from '../../shared/couchdb.service';

@Component({
  selector: 'planet-chat-window',
  templateUrl: './chat-window.component.html',
  styleUrls: [ './chat-window.scss' ],
})
export class ChatWindowComponent implements OnInit {
  spinnerOn = true;
  promptForm: FormGroup;
  data = {
    user: this.userService.get(),
    time: this.couchService.datePlaceholder,
    content: '',
    _id: '',
    _rev: ''
  };
  selectedConversationId: any;
  conversations: any[] = [];

  @ViewChild('chat') chatContainer: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
    private userService: UserService,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.createForm();

    this.chatService.selectedConversationId$.subscribe((conversationId) => {
      this.selectedConversationId = conversationId;
      this.fetchConversation(this.selectedConversationId?._id);
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

  createForm() {
    this.promptForm = this.formBuilder.group({
      prompt: [ '', Validators.required ],
    });
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

    if (this.selectedConversationId) {
      this.data._id = this.selectedConversationId._id;
      this.data._rev = this.selectedConversationId._rev;
    } else {
      delete this.data._id;
      delete this.data._rev;
    }

    console.log(this.data);

    this.chatService.getPrompt(this.data, true).subscribe(
      (completion: any) => {
        console.log(completion);
        this.conversations.push({
          query: content,
          response: completion?.chat,
        });
        this.selectedConversationId = {
          '_id': completion.couchDBResponse?.id,
          '_rev': completion.couchDBResponse?.rev
        };
        console.log(this.selectedConversationId);

        this.postSubmit();
      },
      (error: any) => {
        this.spinnerOn = false;
        this.conversations.push({
          query: content,
          response: 'Error: ' + error.message,
          error: true,
        });
        this.postSubmit();
      }
    );
  }
}
