import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
// import { DialogsLoadingService } from './dialogs-loading.service';

import { NewsService } from '../../news/news.service';

@Component({
  template: `
  <h3 mat-dialog-title i18n>Share this conversation</h3>
  <mat-dialog-content>
    <span i18n>Share with Community  </span>
    <button mat-raised-button (click)="shareWithCommunity()" i18n>
      Share
    </button>
  </mat-dialog-content>
  <mat-dialog-actions>
    <button color="primary" mat-raised-button mat-dialog-close i18n>OK</button>
  </mat-dialog-actions>
  `
})
export class DialogsChatShareComponent {
  conversation: any;

  constructor(
    public dialogRef: MatDialogRef<DialogsChatShareComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    // private dialogsLoadingService: DialogsLoadingService
    private newsService: NewsService
  ) {
    this.conversation = data || this.conversation;
  }

  shareWithCommunity() {
    this.conversation.chat = true;
    this.newsService.shareNews(this.conversation).subscribe(() => {});
  }

}
