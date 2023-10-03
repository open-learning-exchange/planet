import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { showFormErrors } from '../shared/table-helpers';
import { ChatService } from '../shared/chat.service';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.component.scss' ],
})
export class ChatComponent implements OnInit, OnDestroy {
  spinnerOn = true;
  streamingOn = false;
  promptForm: FormGroup;
  conversations: any[] = [];

  @ViewChild('chat') chatContainer: ElementRef;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private changeDetectorRef: ChangeDetectorRef,
    private chatService: ChatService
  ) {}

  ngOnInit() {
    this.createForm();
    this.initializeChatStream();
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

  initializeChatStream() {
    // Subscribe to WebSocket messages
    this.chatService.getChatStream().subscribe((message) => {
      // Handle incoming messages from the chat stream
      this.handleIncomingMessage(message);
    });
  }

  handleIncomingMessage(message: string) {
    const lastConversation = this.conversations[this.conversations.length - 1];
    lastConversation.response += message;
    this.spinnerOn = false;
    this.changeDetectorRef.detectChanges();
    this.spinnerOn = true;
    this.scrollToBottom();
  }

  onSubmit() {
    if (this.promptForm.valid) {
      this.submitPrompt();
      this.promptForm.controls['prompt'].setValue(' ');
    } else {
      showFormErrors(this.promptForm.controls);
    }
  }

  submitPrompt() {
    const content = this.promptForm.get('prompt').value;

    if (this.streamingOn) {
      this.conversations.push({ role: 'user', query: content, response: '' });
      this.chatService.sendUserInput(content);
    } else {
      this.chatService.getPrompt(content).subscribe(
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
          this.conversations.push({
            query: content,
            response: 'Error: ' + error.message,
            error: true,
          });
          this.changeDetectorRef.detectChanges();
          this.scrollToBottom();
          this.spinnerOn = true;
        }
      );
    }
  }
}
