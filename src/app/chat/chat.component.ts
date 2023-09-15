import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CustomValidators } from '../validators/custom-validators';
import { showFormErrors } from '../shared/table-helpers';
import { ChatService } from '../shared/chat.service';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.component.scss' ],
})
export class ChatComponent implements OnInit {
  spinnerOn = true;
  sidebarOpen = false;
  promptForm: FormGroup;
  data = {
    user: this.userService.get(),
    time: this.couchService.datePlaceholder,
    content: ''
  };
  messages: any[] = [];
  conversations: any[] = [];

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
      saveChat: [ false ],
    });
  }

  goBack() {
    this.router.navigate([ '/' ], { relativeTo: this.route });
  }

  onSubmit() {
    if (!this.promptForm.valid) {
      showFormErrors(this.promptForm.controls);
      return;
    }

    this.submitPrompt();
  }

  submitPrompt() {
    const save = this.promptForm.get('saveChat').value;
    const content = this.promptForm.get('prompt').value;
    this.messages.push({ role: 'user', content });

    this.data.content = content;

    this.chatService.getPrompt(this.data, save).subscribe(
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

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
}
