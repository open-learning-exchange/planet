import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { UserService } from '@shared/auth/user.service';
import { CouchService } from '@shared/database/couchdb.service';
import { NotificationsService, notificationRecipient } from '../notifications/notifications.service';
import { StateService } from '@shared/state.service';
import { NewsService } from './news.service';
import { UsersProfileDialogService } from '../users/users-profile/users-profile-dialog.service';
import { AuthService } from '@shared/auth/auth-guard.service';
import { doesMarkdownPreviewTruncate, hasMarkdownImages } from '@shared/utils';
import { DeviceInfoService, DeviceType } from '@shared/platform/device-info.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatCard, MatCardHeader, MatCardSubtitle, MatCardContent, MatCardActions } from '@angular/material/card';
import { MatChipSet, MatChip, MatChipRemove } from '@angular/material/chips';
import { NgClass, NgTemplateOutlet, SlicePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { LabelComponent } from '@shared/ui/label.component';
import { MatTooltip } from '@angular/material/tooltip';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import { ChatOutputDirective } from '@shared/ai/chat-output.directive';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { TimeAgoPipe } from '@shared/text/time-ago.pipe';
import { DEFAULT_VOICE_LABELS, dedupeVoiceLabels, voiceLabelsEqual } from '@shared/voices/voice-labels';
import { FullNamePipe } from '@shared/text/full-name.pipe';

@Component({
  selector: 'planet-news-list-item',
  templateUrl: 'news-list-item.component.html',
  styleUrls: ['./news-list-item.scss'],
  imports: [
    MatCard,
    MatCardHeader,
    MatCardSubtitle,
    MatChipSet,
    MatChip,
    MatIcon,
    LabelComponent,
    MatChipRemove,
    MatTooltip,
    MatCardContent,
    PlanetMarkdownComponent,
    ChatOutputDirective,
    NgClass,
    MatIconButton,
    MatCardActions,
    MatButton,
    MatMenuTrigger,
    MatMenu,
    NgTemplateOutlet,
    MatMenuItem,
    SlicePipe,
    TimeAgoPipe,
    FullNamePipe
  ]
})
export class NewsListItemComponent implements OnInit, OnChanges, OnDestroy {

  @Input() item;
  @Input() replyObject;
  @Input() replyView;
  @Input() isMainPostShared = true;
  @Input() showRepliesButton = true;
  @Input() editable = true;
  @Input() readOnly = false;
  @Input() shareTarget: 'community' | 'nation' | 'center';
  @Output() changeReplyViewing = new EventEmitter<any>();
  @Output() updateNews = new EventEmitter<any>();
  @Output() deleteNews = new EventEmitter<any>();
  @Output() shareNews = new EventEmitter<{ news: any, local: boolean }>();
  @Input() customLabels: string[] = [];
  @Output() changeLabels = new EventEmitter<{ label: string, action: 'remove' | 'add' | 'select', news: any }>();
  onDestroy$ = new Subject<void>();
  currentUser = this.userService.get();
  showExpand = false;
  showLess = true;
  showShare = false;
  planetCode = this.stateService.configuration.code;
  targetLocalPlanet = true;
  labels = { listed: [], all: [ ...DEFAULT_VOICE_LABELS ] };
  teamLabels = [];
  previewLimit = 500;
  deviceType: DeviceType;
  isMobile: boolean;

  constructor(
    private router: Router,
    private userService: UserService,
    private couchService: CouchService,
    private newsService: NewsService,
    private notificationsService: NotificationsService,
    private stateService: StateService,
    private usersProfileDialogService: UsersProfileDialogService,
    private authService: AuthService,
    private clipboard: Clipboard,
    private deviceInfoService: DeviceInfoService,
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
      this.isMobile = deviceType === DeviceType.SMALL_MOBILE || deviceType === DeviceType.MOBILE;
    });
  }

  ngOnInit() {
    this.handleItemExpansion();
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.currentUser = this.userService.get();
    });
    this.addTeamLabelsFromViewIn();
  }

  ngOnChanges() {
    this.targetLocalPlanet = this.shareTarget === this.stateService.configuration.planetType;
    this.showShare = this.shouldShowShare();
    this.updateLabelsAll();
    if (this.item.doc.viewIn && this.item.doc.viewIn.length > 0 && this.item.sharedDate && !this.item.doc.replyTo) {
      const viewIn = this.item.doc.viewIn[0];
      if (viewIn.name) {
        const sourceType = viewIn.mode === 'enterprise' ? 'enterprise' : 'team';
        this.item.sharedSourceInfo = `shared on ${new Date(this.item.sharedDate).toLocaleString()} from ${sourceType} ${viewIn.name}`;
      }
    } else {
      this.item.sharedSourceInfo = null;
    }
    this.handleItemExpansion();
  }

  updateLabelsAll() {
    this.labels.all = dedupeVoiceLabels([ ...DEFAULT_VOICE_LABELS, ...this.customLabels ]);
    this.labels.listed = this.labels.all.filter(label =>
      !(this.item.doc.labels || []).some(itemLabel => voiceLabelsEqual(itemLabel, label))
    );
  }

  get canEditLabels(): boolean {
    const originPlanet = this.item.doc.createdOn || this.item.doc.messagePlanetCode || this.item.doc.user?.planetCode;
    return this.editable && originPlanet === this.planetCode && this.canModifyNews;
  }

  get canModifyNews(): boolean {
    return this.item.doc.user?.name === this.currentUser.name || this.currentUser.isUserAdmin;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  addReply(news) {
    if (this.readOnly) {
      return;
    }
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

  handleItemExpansion() {
    if (this.item.latestMessage) {
      this.showExpand = true;
      this.showLess = false;
    } else {
      this.showLess = true;
    }
    if (this.item.doc.news?.conversations?.length > 1) {
      this.showExpand = true;
    } else {
      const message = typeof this.item.doc.message === 'string' ? this.item.doc.message : '';
      const imagesLength = Array.isArray(this.item.doc.images) ? this.item.doc.images.length : 0;
      this.showExpand = doesMarkdownPreviewTruncate(message, this.previewLimit) ||
        hasMarkdownImages(message) || imagesLength > 0;
    }
  }

  sendNewsNotifications(news: any = '') {
    const replyBy = this.currentUser.name;
    const legacyPlanetCode = news.createdOn || this.stateService.configuration.code;
    const recipient = notificationRecipient(news.user, legacyPlanetCode);
    const sender = notificationRecipient(this.currentUser, this.stateService.configuration.code);
    if (recipient.user === sender.user && recipient.userPlanetCode === sender.userPlanetCode) {
      return;
    }
    const link = this.router.url;
    const notification = {
      ...recipient,
      message:  $localize`<b>${replyBy}</b> replied to your ${news.viewableBy === 'community' ? 'community ' : ''}message.`,
      link,
      priority: 1,
      type: 'replyMessage',
      replyTo: news._id,
      status: 'unread',
      time: this.couchService.datePlaceholder,
    };
    this.notificationsService.sendNotificationToUser(notification).subscribe();
  }

  editNews(news) {
    if (this.readOnly) {
      return;
    }
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
    if (this.readOnly) {
      return;
    }
    this.deleteNews.emit(news);
  }

  shareStory(news) {
    if (this.readOnly) {
      return;
    }
    this.shareNews.emit({ news, local: this.targetLocalPlanet });
  }

  labelClick(label, action) {
    if (this.readOnly && action !== 'select') {
      return;
    }
    this.changeLabels.emit({ label, action, news: this.item.doc });
  }

  shouldShowShare() {
    return !this.readOnly && this.shareTarget && (this.editable || this.item.doc.user._id === this.currentUser._id) &&
      (!this.targetLocalPlanet || (!this.newsService.postSharedWithCommunity(this.item) && this.isMainPostShared));
  }

  openMemberDialog(member, event?: Event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    this.authService.checkAuthenticationStatus().subscribe(() => {
      this.usersProfileDialogService.open(
        { member: { ...member, userPlanetCode: member.planetCode } },
        { restoreFocus: false }
      );
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
