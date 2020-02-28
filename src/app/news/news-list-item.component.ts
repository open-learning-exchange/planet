import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, OnInit, OnChanges, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StateService } from '../shared/state.service';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { NewsService } from './news.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent implements OnChanges, AfterViewChecked {

  @Input() item;
  @Input() replyObject;
  @Input() isMainPostShared = true;
  @Input() showRepliesButton = true;
  @Input() editable = true;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  @Output() shareNews = new EventEmitter<{ news: any, local: boolean }>();
  @Output() changeLabels = new EventEmitter<{ label: string, action: 'remove' | 'add', news: any }>();
  @ViewChild('content') content;
  currentUser = this.userService.get();
  showExpand = false;
  showLess = true;
  showShare = false;
  planetCode = this.stateService.configuration.code;
  targetLocalPlanet = true;
  labels = { listed: [], all: [ 'help', 'offer', 'advice' ] };

  constructor(
    private router: Router,
    private userService: UserService,
    private couchService: CouchService,
    private newsService: NewsService,
    private cdRef: ChangeDetectorRef,
    private notificationsService: NotificationsService,
    private stateService: StateService
  ) {}

  ngOnChanges() {
    this.targetLocalPlanet = this.shareTarget === this.stateService.configuration.planetType;
    this.showShare = this.shouldShowShare();
    this.labels.listed = this.labels.all.filter(label => (this.item.doc.labels || []).indexOf(label) === -1);
  }

  ngAfterViewChecked() {
    const offsetHeight = this.content && this.content.nativeElement.children[0].children[0].children[0].offsetHeight;
    const showExpand = offsetHeight && (offsetHeight > this.content.nativeElement.clientHeight);
    if (showExpand !== this.showExpand) {
      this.showExpand = showExpand;
      this.cdRef.detectChanges();
    }
  }

  remToPx(rem) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
  }

  addReply(news) {
    const label = this.formLabel(news);
    this.updateNews.emit({
      title: `Reply to ${label}`,
      placeholder: `Your ${label}`,
      initialValue: '',
      news: {
        replyTo: news._id,
        messagePlanetCode: news.messagePlanetCode,
        messageType: news.messageType,
        viewIn: news.viewIn
      }
    });
    this.sendNewsNotifications(news);
  }

  sendNewsNotifications(news: any = '') {
    const replyBy = this.currentUser.name;
    const userId = news.user._id;
    if (replyBy === news.user.name) {
      return;
    }
    const link = this.router.url;
    const notification = {
      user: userId,
      'message': `<b>${replyBy}</b> replied to your ${news.viewableBy === 'community' ? 'community ' : ''}message.`,
      link,
      'priority': 1,
      'type': 'replyMessage',
      'replyTo': news._id,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
    };
    this.notificationsService.sendNotificationToUser(notification).subscribe();
  }

  editNews(news) {
    const label = this.formLabel(news);
    this.updateNews.emit({
      title: `Edit ${label}`,
      placeholder: `Your ${label}`,
      initialValue: news.message,
      news
    });
  }

  formLabel(news) {
    return news.viewableBy === 'teams' ? 'Message' : 'Story';
  }

  showReplies(news) {
    this.changeReplyViewing.emit(news);
  }

  openDeleteDialog(news) {
    this.deleteNews.emit(news);
  }

  shareStory(news) {
    this.shareNews.emit({ news, local: this.targetLocalPlanet });
  }

  labelClick(label, action) {
    this.changeLabels.emit({ label, action, news: this.item.doc });
  }

  shouldShowShare() {
    return this.shareTarget && (this.editable || this.item.doc.user._id === this.currentUser._id) &&
      (!this.targetLocalPlanet || (!this.newsService.postSharedWithCommunity(this.item) && this.isMainPostShared));
  }

}
