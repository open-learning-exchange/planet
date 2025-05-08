import { Component, Input, Output, EventEmitter, ViewChild, ChangeDetectorRef, OnInit, OnChanges, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StateService } from '../shared/state.service';
import { NewsService } from './news.service';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';
import { AuthService } from '../shared/auth-guard.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent implements OnInit, OnChanges, AfterViewChecked {

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
    private stateService: StateService,
    private dialog: MatDialog,
    private authService: AuthService,
    private clipboard: Clipboard
  ) {}

  ngOnInit() {
    if (this.item.latestMessage) {
      this.showExpand = true;
      this.showLess = false;
    }
  }

  ngOnChanges() {
    this.targetLocalPlanet = this.shareTarget === this.stateService.configuration.planetType;
    this.showShare = this.shouldShowShare();
    this.labels.listed = this.labels.all.filter(label => (this.item.doc.labels || []).indexOf(label) === -1);
    if (this.item.sharedSource && this.item.sharedDate && this.item.sharedSource.name) {
      const sourceType = this.item.sharedSource.mode === 'enterprise' ? 'enterprise' : 'team';
      this.item.sharedSourceInfo = `shared on ${new Date(this.item.sharedDate).toLocaleString()} from ${sourceType} ${this.item.sharedSource.name}`;
    } else if (this.item.doc.viewIn && this.item.doc.viewIn.length > 0 && this.item.sharedDate) {
      const viewIn = this.item.doc.viewIn[0];
      if (viewIn.name) {
        const sourceType = viewIn.mode === 'enterprise' ? 'enterprise' : 'team';
        this.item.sharedSourceInfo = `shared on ${new Date(this.item.sharedDate).toLocaleString()} from ${sourceType} ${viewIn.name}`;
      }
    } else {
      this.item.sharedSourceInfo = null;
    }
  }

  ngAfterViewChecked() {
    const contentHeight = this.content && this.content.nativeElement.scrollHeight;
    const containerHeight = this.content && this.content.nativeElement.offsetHeight;
    const showExpand = contentHeight > containerHeight;
    if (showExpand !== this.showExpand) {
      this.showExpand = showExpand;
      this.cdRef.detectChanges();
    }
  }

  remToPx(rem) {
    const computedStyle = getComputedStyle(document.documentElement).fontSize;
    if (!computedStyle) { return; }
    return rem * parseFloat(computedStyle);
  }

  addReply(news) {
    const label = this.formLabel(news);
    this.authService.checkAuthenticationStatus().subscribe(() => {
      this.updateNews.emit({
        title: $localize`Reply to ${label}`,
        placeholder:  $localize`Your ${label}`,
        initialValue: '',
        news: {
          replyTo: news._id,
          messagePlanetCode: news.messagePlanetCode,
          messageType: news.messageType,
          viewIn: news.viewIn
        }
      });
      this.sendNewsNotifications(news);
    });
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
      'message':  $localize`<b>${replyBy}</b> replied to your ${news.viewableBy === 'community' ? 'community ' : ''}message.`,
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
    const editTimestamp = $localize`Edited on ${new Date().toLocaleString()}`;
    const sharedSourceInfo = this.item.sharedSourceInfo;
    const initialValue = news.message === '</br>' ? '' : news.message;
    this.updateNews.emit({
      title: $localize`Edit ${label}`,
      placeholder: $localize`Your ${label}`,
      initialValue,
      news: {
        ...news,
        editTimestamp,
        sharedSourceInfo
      }
    });
  }

  formLabel(news) {
    return news.viewableBy === 'teams' ? $localize`Message` : $localize`Voice`;
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

  openMemberDialog(member) {
    this.authService.checkAuthenticationStatus().subscribe(() => {
      this.dialog.open(UserProfileDialogComponent, {
        data: { member: { ...member, userPlanetCode: member.planetCode } },
        maxWidth: '90vw',
        maxHeight: '90vh'
      });
    });
  }

  copyLink(voice) {
    const link = `${window.location.origin}/voices/${voice._id}`;
    this.clipboard.copy(link);
  }
}
