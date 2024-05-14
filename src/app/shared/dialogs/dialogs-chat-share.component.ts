import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { NewsService } from '../../news/news.service';

@Component({
  template: `
  <h2 mat-dialog-title i18n>Share this conversation</h2>
  <mat-dialog-content>
    <h4 i18n>- Share with Community: </h4>
    <div style="margin-left: 1.5rem">
      <button mat-icon-button (click)="showForm = !showForm">
        <mat-icon>{{showForm ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}}</mat-icon>
      </button>
      <i i18n>add message</i>
      <form [formGroup]="shareChatForm" (ngSubmit)="shareWithCommunity()">
        <mat-form-field *ngIf="showForm" style="margin-right: 2rem;">
          <textarea matInput placeholder="Optional message" formControlName="message" i18n-placeholder></textarea>
        </mat-form-field>
        <button mat-raised-button color="primary" type="submit" i18n>Share</button>
      </form>
    </div>
  </mat-dialog-content>
  <mat-dialog-actions>
    <button color="primary" mat-raised-button mat-dialog-close i18n>OK</button>
  </mat-dialog-actions>
  `
})
export class DialogsChatShareComponent {
  conversation: any;
  showForm: boolean;
  shareChatForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<DialogsChatShareComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private formBuilder: FormBuilder,
    private newsService: NewsService
  ) {
    this.conversation = data || this.conversation;
  }

  ngOnInit() {
    this.shareChatForm = this.formBuilder.group({
      message: ['']
    });
  }

  shareWithCommunity() {
    if (this.shareChatForm.valid) {
      const message = this.shareChatForm.get('message').value;
      this.conversation.message = message ? message : '</br>';
    }
    this.conversation.chat = true;
    this.newsService.shareNews(this.conversation).subscribe(() => {});
  }

}
