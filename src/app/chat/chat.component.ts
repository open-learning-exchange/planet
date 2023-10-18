import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { showFormErrors } from '../shared/table-helpers';
import { ChatService } from '../shared/chat.service';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.component.scss' ],
})
export class ChatComponent implements OnInit, OnDestroy {
  spinnerOn = true;
  setStreamOn = true;
  disabled = false;
  promptForm: FormGroup;
  conversations: any[] = [];
  data = {
    user: this.userService.get(),
    time: this.couchService.datePlaceholder,
    content: ''
  };

  @ViewChild('chat') chatContainer: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService,
    private userService: UserService,
    private couchService: CouchService
  ) {}

  ngOnInit() {
    this.createForm();
    this.initializeChatStream();
    this.initializeErrorStream();
  }

  ngOnDestroy() {
    this.chatService.closeWebSocket();
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

  goBack() {
    this.router.navigate([ '/' ], { relativeTo: this.route });
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

  onSubmit() {
    if (this.promptForm.valid) {
      this.submitPrompt();
    } else {
      showFormErrors(this.promptForm.controls);
    }
  }

  postSubmit() {
    this.changeDetectorRef.detectChanges();
    this.spinnerOn = true;
    this.scrollToBottom();
    this.promptForm.controls['prompt'].setValue('');
  }

  submitPrompt() {
    const content = this.promptForm.get('prompt').value;

    this.data.content = content;

    if (this.setStreamOn) {
      this.conversations.push({ role: 'user', query: content, response: '' });
      this.chatService.sendUserInput(content);
    } else {
      this.chatService.getPrompt(this.data, true).subscribe(
        (completion: any) => {
          this.conversations.push({
            query: content,
            response: completion?.chat,
          });
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
}
