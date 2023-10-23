import { Component, Input, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

import { CustomValidators } from '../../validators/custom-validators';
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
  messages: any[] = [];
  conversations: any[] = [];
  selectedConversationId: any;

  // @Input() conversationId: any;
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
      prompt: [ '', CustomValidators.required ],
    });
  }

  onSubmit() {
    if (!this.promptForm.valid) {
      showFormErrors(this.promptForm.controls);
      return;
    }

    this.submitPrompt();
  }

  submitPrompt() {
    const content = this.promptForm.get('prompt').value;
    this.messages.push({ role: 'user', content });

    if (this.selectedConversationId) {
      this.data._id = this.selectedConversationId._id;
      this.data._rev = this.selectedConversationId._rev;
    } else {
      delete this.data._id;
      delete this.data._rev;
    }

    this.data.content = content;

    this.chatService.getPrompt(this.data, true).subscribe(
      (completion: any) => {
        this.conversations.push({
          query: content,
          response: completion?.chat,
        });
        this.spinnerOn = false;
        this.changeDetectorRef.detectChanges();
        this.scrollToBottom();
        this.spinnerOn = true;
      },
      (error: any) => {
        this.spinnerOn = false;
        this.changeDetectorRef.detectChanges();
        this.conversations.push({
          query: content,
          response: 'Error: ' + error.message,
          error: true,
        });
        this.spinnerOn = true;
      }
    );
  }

sanitizeText(text: string): string {
  // Replace newline characters with <br> tags
  const textWithLineBreaks = text.replace(/\n/g, '<br>');

  // Replace code block markers with <code> tags
  const codeBlockStart = /```/g;
  const codeBlockEnd = /```/g;
  const textWithCodeBlocks = textWithLineBreaks
    .replace(codeBlockStart, '<code>')
    .replace(codeBlockEnd, '</code>');

  return textWithCodeBlocks;
}
}
