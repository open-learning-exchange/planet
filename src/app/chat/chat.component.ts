import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { CustomValidators } from '../validators/custom-validators';
import { showFormErrors } from '../shared/table-helpers';
import { ChatService } from '../shared/chat.service';

@Component({
  selector: 'planet-chat',
  templateUrl: './chat.component.html',
  styleUrls: [ './chat.component.scss' ],
})
export class ChatComponent implements OnInit {
  spinnerOn = false;
  promptForm: FormGroup;
  messages: any[] = [];
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
  }

  scrollToBottom(): void {
    this.chatContainer.nativeElement.scrollTo({
      top: this.chatContainer.nativeElement.scrollHeight,
      behavior: 'smooth',
    });
  }

  createForm() {
    this.promptForm = this.formBuilder.group({
      prompt: [ '', CustomValidators.requiredMarkdown ],
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
    console.log('submitting');

    const content = this.promptForm.get('prompt').value;
    this.messages.push({ role: 'user', content });

    this.chatService.getPrompt(content).subscribe(
      (completion: string) => {
        this.conversations.push({
          query: content,
          response: completion,
        });
        this.spinnerOn = false;
        this.changeDetectorRef.detectChanges();
        this.scrollToBottom();
        this.spinnerOn = true;
      },
      (error: any) => {
        console.log(error);
        this.conversations.push({
          query: content,
          response: 'Error: ' + error.message,
          error: true,
        });
      }
    );
  }
}
