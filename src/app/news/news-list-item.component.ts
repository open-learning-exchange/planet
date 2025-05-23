import { Component, Input, Output, EventEmitter, OnInit, OnChanges, HostListener } from '@angular/core';
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
import { calculateMdAdjustedLimit } from '../shared/utils';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: [ './news-list-item.scss' ]
})
export class NewsListItemComponent implements OnInit, OnChanges {

  @Input() item;
  @Input() replyObject;
  @Input() replyView;
  @Input() isMainPostShared = true;
  @Input() showRepliesButton = true;
  @Input() editable = true;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  @Output() shareNews = new EventEmitter<{ news: any, local: boolean }>();
  @Output() changeLabels = new EventEmitter<{ label: string, action: 'remove' | 'add', news: any }>();
  currentUser = this.userService.get();
  showExpand = false;
  showLess = true;
  showShare = false;
  planetCode = this.stateService.configuration.code;
  targetLocalPlanet = true;
  labels = { listed: [], all: [ 'help', 'offer', 'advice' ] };
  teamLabels = [];
  previewLimit = 500;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;

  constructor(
    private router: Router,
    private userService: UserService,
    private couchService: CouchService,
    private newsService: NewsService,
    private notificationsService: NotificationsService,
    private stateService: StateService,
    private dialog: MatDialog,
    private authService: AuthService,
    private clipboard: Clipboard,
    private deviceInfoService: DeviceInfoService,
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    if (this.item.latestMessage) {
      this.showExpand = true;
      this.showLess = false;
    }
    if (this.item.doc.news?.conversations.length > 1) {
      this.showExpand = true;
    } else if (this.replyView) {
      this.showExpand = false;
      this.showLess = false;
    } else {
      this.showExpand = this.item.doc.message.length > calculateMdAdjustedLimit(this.item.doc.message, this.previewLimit)
        || this.item.doc.images.length > 0;
    }
    this.addTeamLabelsFromViewIn();
  }

  ngOnChanges() {
    this.targetLocalPlanet = this.shareTarget === this.stateService.configuration.planetType;
    this.showShare = this.shouldShowShare();
    this.labels.listed = this.labels.all.filter(label => (this.item.doc.labels || []).indexOf(label) === -1);
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
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
    const initialValue = news.message === '</br>' ? '' : news.message;
    this.updateNews.emit({
      title: $localize`Edit ${label}`,
      placeholder: $localize`Your ${label}`,
      initialValue,
      news
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

  addTeamLabelsFromViewIn() {
    if ([ 'teams', 'enterprises' ].some(route => this.router.url.includes(route))) {
      this.teamLabels = [];
      return;
    }
    this.item.doc.viewIn.forEach(view => {
      if (view.section === 'teams' && view.name) {
        this.teamLabels.push(`${view.name}`);
      }
    });
  }

  copyLink(voice) {
    const link = `${window.location.origin}/voices/${voice._id}`;
    this.clipboard.copy(link);
  }
}
