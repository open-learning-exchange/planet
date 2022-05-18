import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'planet-teams-comments',
  template: `<div class="comment-container">
                  <span>You have <b style="font-size: 22px; font-weight: bolder;">{{comments}}</b> unread comments.</span>
                  <button mat-raised-button color="primary" (click)="readComments()">Read comments</button>
                </div>`,
  styles: [ `
  .comment-container {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    height: 80px;
    font-size: 18px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  }

  .comment-container button {
    margin-left: 30px;
  }
  ` ]
})

export class TeamsCommentsComponent {
  @Input() comments: any;
  @Output() selectReports = new EventEmitter();

    constructor() {}

    readComments() {
      this.selectReports.emit();
    }
}
