import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent implements OnInit {

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

  ngOnInit() {
    this.setDisplayMessage(this.item);
  }

  setDisplayMessage(news) {
    let lines: string[] = news.message.split('\n\n');
    if (lines.length > 6) {
      let message: string = lines[0];
      for (let i=1; i<=5; i++) {
        message = message + '\n\n' + lines[i];
      }
      news.displayMessage = message;
      news.showMore = true;
      news.showLess = false;
    } else {
      news.displayMessage = news.message;
      news.showMore = false;
      news.showLess = false;
    }
  }

  toggleShowMoreLess(news) {
    if (news.showMore) {
      news.displayMessage = news.message;
      news.showMore = false;
      news.showLess = true;
    } else if (news.showLess) {
      this.setDisplayMessage(news);
    }
  }

  addReply(news) {
    this.updateNews.emit({
      title: 'Reply to Post',
      placeholder: 'Your Story',
      initialValue: '',
      news: {
        replyTo: news._id,
        messagePlanetCode: news.messagePlanetCode,
        messageType: news.messageType
      }
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
