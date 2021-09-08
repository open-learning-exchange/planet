import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: 'planet-teams-comments',
  template: `<div class="comment-container">
                  <span>You have <b style="font-size: 22px; font-weight: bolder;">{{comments}}</b> <em (click)="readComments()">unread</em> comments.</span>
                </div>`,
  styles: [`
  .comment-container {
    width: 60%;
    margin: 8px auto;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    height: 60px;
    font-size: 18px;
  }

  em {
    cursor: pointer;
    color: blue;
  }

  em:hover {
    color: black;
  }
  `]
})

export class TeamsCommentsComponent {
  @Input() comments: any;
  @Output() selectReports = new EventEmitter();

    constructor() {}

    readComments() {
      this.selectReports.emit();
    }
}