import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styles: [ `
    :host mat-card {
      margin: 0.25rem;
    }
  ` ]
})
export class NewsListItemComponent {

  @Input() item;
  @Input() replyObject;
  @Input() showRepliesButton = true;
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  currentUser = this.userService.get();

  constructor(
    private userService: UserService
  ) {}

  addReply(news) {
    this.updateNews.emit({
      title: 'Reply to Post',
      placeholder: 'Your Story',
      initialValue: '',
      news: { 
        replyTo: news._id,
        messageType: "sync" }
    });
  }

  editNews(news) {
    this.updateNews.emit({
      title: 'Edit Post',
      placeholder: 'Your Story',
      initialValue: news.message,
      news
    });
  }

  showReplies(news) {
    this.changeReplyViewing.emit(news);
  }

  openDeleteDialog(news) {
    this.deleteNews.emit(news);
  }

}
