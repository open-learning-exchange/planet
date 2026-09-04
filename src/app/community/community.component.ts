import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NonNullableFormBuilder, FormControl, FormGroup, FormsModule } from '@angular/forms';
import { EMPTY, Subject, Subscription, forkJoin, iif, of } from 'rxjs';
import { takeUntil, finalize, switchMap, map, catchError, tap, debounceTime, distinctUntilChanged, take, filter } from 'rxjs/operators';
import { StateService } from '@shared/state.service';
import { NewsService } from '../news/news.service';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { CommunityLinkDialogComponent } from './community-link-dialog.component';
import { TeamsService } from '../teams/teams.service';
import { DialogsPromptComponent } from '@shared/dialogs/dialogs-prompt.component';
import { CouchService } from '@shared/database/couchdb.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { UserService } from '@shared/auth/user.service';
import { UsersService } from '../users/users.service';
import { findDocuments } from '@shared/database/mango-queries';
import { CustomValidators } from '../validators/custom-validators';
import { environment } from '../../environments/environment';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { DeviceInfoService, DeviceType } from '@shared/platform/device-info.service';
import { DialogsAnnouncementSuccessComponent } from '@shared/challenges/dialogs-announcement.component';
import { UserChallengeStatusService } from '@shared/challenges/user-challenge-status.service';
import { ConfigurationCheckService } from '@shared/platform/configuration-check.service';
import { ChallengesService } from '@shared/challenges/challenges.service';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { NgClass } from '@angular/common';
import { PlanetLoadingSpinnerComponent } from '@shared/ui/planet-loading-spinner.component';
import { NewsListComponent } from '../news/news-list.component';
import { MatToolbar } from '@angular/material/toolbar';
import { MatFormField, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { LabelComponent } from '@shared/ui/label.component';
import { MatOption } from '@angular/material/autocomplete';
import { AuthorizedRolesDirective } from '@shared/auth/authorized-roles.directive';
import { MatButton, MatIconButton } from '@angular/material/button';
import { TeamsMemberComponent } from '../teams/teams-member.component';
import { PlanetMarkdownComponent } from '@shared/markdown/planet-markdown.component';
import {
  MatNavList, MatListSubheaderCssMatStyler, MatListItem, MatListItemIcon, MatListItemTitle, MatListItemMeta
} from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { CommunityListComponent } from './community-list.component';
import { DialogsVoiceLabelsComponent } from '@shared/voices/dialogs-voice-labels.component';
import { TeamsViewFinancesComponent } from '../teams/teams-view-finances.component';
import { TeamsReportsComponent } from '../teams/teams-reports.component';
import { PlanetCalendarComponent } from '@shared/calendar/calendar.component';
import { dedupeVoiceLabels, normalizeVoiceLabel, SHARED_CHAT_LABEL, voiceLabelsEqual } from '@shared/voices/voice-labels';

interface CommunityDescriptionForm {
  description: FormControl<string>;
}

@Component({
  selector: 'planet-community',
  templateUrl: './community.component.html',
  preserveWhitespaces: true,
  styleUrls: ['./community.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [
    MatTabGroup,
    MatTab,
    PlanetLoadingSpinnerComponent,
    NewsListComponent,
    MatToolbar,
    NgClass,
    MatFormField,
    MatLabel,
    MatIcon,
    MatPrefix,
    MatSuffix,
    MatInput,
    FormsModule,
    MatSelect,
    MatSelectTrigger,
    LabelComponent,
    MatOption,
    AuthorizedRolesDirective,
    MatButton,
    MatIconButton,
    TeamsMemberComponent,
    PlanetMarkdownComponent,
    MatNavList,
    MatListSubheaderCssMatStyler,
    MatListItem,
    RouterLink,
    MatTooltip,
    MatListItemIcon,
    MatListItemTitle,
    MatListItemMeta,
    CommunityListComponent,
    TeamsViewFinancesComponent,
    TeamsReportsComponent,
    PlanetCalendarComponent
  ]
})
export class CommunityComponent implements OnInit, OnDestroy {

  configuration: any = this.stateService.configuration || {};
  customVoiceLabels: string[] = this.configuration.customVoiceLabels || [];
  teamId = planetAndParentId(this.stateService.configuration);
  team: any = { _id: this.teamId, teamType: 'sync', teamPlanetCode: this.stateService.configuration.code, type: 'services' };
  user = this.userService.get();
  isLoggedIn = this.user._id !== undefined;
  news: any[] = [];
  filteredNews: any[] = [];
  links: any[] = [];
  finances: any[] = [];
  communityDataLoading = false;
  councillors: any[] = [];
  reports: any[] = [];
  showNewsButton = true;
  deleteMode = false;
  onDestroy$ = new Subject<void>();
  communityDataRequest$ = new Subject<void>();
  newsRequestSubscription?: Subscription;
  isCommunityLeader = this.user.isUserAdmin || this.user?.roles?.indexOf('leader') > -1;
  planetCode = this.route.snapshot.paramMap.get('code');
  shareTarget: string;
  servicesDescriptionLabel: 'Add' | 'Edit';
  deviceType: DeviceType;
  deviceTypes = DeviceType;
  newsLoading = true;
  teamLoading = true;
  currentTab = 0;
  activeReplyId: string | null = null;
  lastReplyId: string | null = null;
  voiceSearch = '';
  voiceSearch$ = new Subject<string>();
  availableLabels: string[] = [];
  private viewLabelNames = new Set<string>();
  selectedLabel = '';
  pinned = false;
  attachmentMap: Record<string, any> = {};

  get isRemoteExchange(): boolean {
    return this.planetCode !== null;
  }

  get localLinks(): any[] {
    return (this.links || []).filter(link => link.teamType !== 'social');
  }

  get socialWebLinks(): any[] {
    return (this.links || []).filter(link => link.teamType === 'social');
  }

  get leadersTabLabel(): string {
    return this.configuration.planetType === 'nation' ? $localize`Nation Leaders` : $localize`Community Leaders`;
  }

  get voicesToolbarPinTooltip(): string {
    return this.pinned ? $localize`Unpin Voices Toolbar` : $localize`Pin Voices Toolbar`;
  }

  localLinkTooltip(link: any): string {
    return link.teamType === 'sync' || !this.isRemoteExchange
      ? ''
      : $localize`${link.title}:linkTitle: is only available on ${this.configuration.name}:planetName:`;
  }

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService,
    private newsService: NewsService,
    private dialogsFormService: DialogsFormService,
    private dialogsLoadingService: DialogsLoadingService,
    private teamsService: TeamsService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private usersService: UsersService,
    private userStatusService: UserChallengeStatusService,
    private deviceInfoService: DeviceInfoService,
    private fb: NonNullableFormBuilder,
    private configurationCheckService: ConfigurationCheckService,
    private challengesService: ChallengesService
  ) {
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });
  }

  ngOnInit() {
    this.configurationCheckService.checkConfiguration().pipe(takeUntil(this.onDestroy$)).subscribe();
    this.communityDataRequest$.pipe(
      tap(() => {
        this.teamLoading = true;
        this.newsLoading = true;
        this.communityDataLoading = true;
        this.activeReplyId = null;
        this.news = [];
        this.filteredNews = [];
        this.links = [];
        this.finances = [];
        this.reports = [];
        this.councillors = [];
        this.newsRequestSubscription?.unsubscribe();
      }),
      switchMap(() => this.loadCommunityData()),
      takeUntil(this.onDestroy$)
    ).subscribe(team => {
      this.team = team;
      this.servicesDescriptionLabel = this.team.description ? 'Edit' : 'Add';
      this.teamLoading = false;
    });
    // planetCode is seeded from the route snapshot; the configuration listener below performs the initial load.
    // This subscription only reloads data when Angular reuses the component for a different community code.
    this.route.paramMap.pipe(
      map(params => params.get('code')),
      filter(planetCode => planetCode !== this.planetCode),
      takeUntil(this.onDestroy$)
    ).subscribe(planetCode => {
      this.planetCode = planetCode;
      this.getCommunityData();
    });
    this.voiceSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.onDestroy$)
    ).subscribe(searchValue => {
      this.voiceSearch = searchValue;
      this.applyFilters();
    });
    const newsSortValue = (item: any) => item.sharedDate || item.doc.time;
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => {
      this.news = news.sort((a, b) => newsSortValue(b) - newsSortValue(a));
      this.filteredNews = this.news;
      this.availableLabels = this.getAvailableLabels(this.news);
      this.newsLoading = false;
      this.applyFilters();
    }, () => this.newsLoading = false);
    this.usersService.usersListener(true).pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      if (!this.isRemoteExchange) {
        this.setCouncillors(users);
      }
    });
    this.stateService.couchStateListener('child_users').pipe(takeUntil(this.onDestroy$)).subscribe(childUsers => {
      if (this.isRemoteExchange && childUsers) {
        const users = childUsers.newData.filter(user => user.planetCode === this.planetCode).map(user => ({ ...user, doc: user }));
        this.setCouncillors(users);
      }
    });
    this.communityChallenge();
    iif(
      () => this.stateService.configuration?._id !== undefined,
      of(this.stateService.configuration),
      this.stateService.couchStateListener('configurations')
    ).pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getCommunityData();
    });
    this.userService.userChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.user = this.userService.get();
      this.isLoggedIn = this.user._id !== undefined;
      this.isCommunityLeader = this.user.isUserAdmin || this.user?.roles?.indexOf('leader') > -1;
      this.getCommunityData();
    });
  }

  ngOnDestroy() {
    this.newsRequestSubscription?.unsubscribe();
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  communityChallenge() {
    const challenge = this.challengesService.getActiveChallenge();
    if (!challenge) {
      return;
    }
    const dialogRef = this.challengesService.openChallengeDialog(this.dialog, challenge);
    dialogRef.afterClosed().pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      if (!this.userStatusService.getCompleteChallenge()) {
        this.sendChallengeNotification(this.user, challenge).pipe(takeUntil(this.onDestroy$)).subscribe();
      }
    });
  }

  sendChallengeNotification(user, challenge) {
    const data = this.challengesService.createChallengeNotification(user._id, challenge, this.couchService.datePlaceholder);
    return this.couchService.updateDocument('notifications', data);
  }

  getCommunityData() {
    this.communityDataRequest$.next();
  }

  private loadCommunityData() {
    const planetCode = this.planetCode;
    const localConfiguration = this.stateService.configuration || {};
    const childPlanetType = this.getChildPlanetType(localConfiguration.planetType);
    const requestedTeam = this.teamObject(planetCode);
    this.shareTarget = this.isRemoteExchange ? undefined : childPlanetType;
    const configurationRequest = this.isRemoteExchange ?
      this.couchService.findAll('communityregistrationrequests', { selector: { code: planetCode } }) :
      of([ localConfiguration ]);
    return configurationRequest.pipe(
      switchMap(configurations => {
        // Configuration is for planet that is being viewed, not planet the user is on
        this.configuration = configurations[0] || {
          code: planetCode,
          name: planetCode,
          planetType: childPlanetType || 'community'
        };
        this.customVoiceLabels = this.configuration.customVoiceLabels || [];
        this.team = requestedTeam;
        this.teamId = this.team._id;
        this.requestNewsAndUsers(planetCode);
        this.communityDataLoading = true;
        return this.getLinks(planetCode);
      }),
      switchMap((res) => {
        this.setLinksAndFinances(res);
        return this.couchService.get(`teams/${requestedTeam._id}`);
      }),
      catchError(err => {
        if (err.statusText === 'Object Not Found') {
          return of(requestedTeam);
        }
        this.teamLoading = false;
        this.communityDataLoading = false;
        this.newsLoading = false;
        return EMPTY;
      })
    );
  }

  private getChildPlanetType(planetType: string): 'community' | 'nation' | undefined {
    return planetType === 'center' ? 'nation' : planetType === 'nation' ? 'community' : undefined;
  }

  requestNewsAndUsers(planetCode?: string) {
    this.newsRequestSubscription = this.newsService.requestNews({
      selectors: {
        $or: [
          { messagePlanetCode: planetCode ? planetCode : this.configuration.code, viewableBy: 'community' },
          { viewIn: { $elemMatch: { _id: this.teamId, section: 'community' } } }
        ]
      },
      viewId: this.teamId
    });
    if (planetCode) {
      this.stateService.requestData('child_users', 'local');
    } else {
      this.usersService.requestUsers();
    }
  }

  openAddMessageDialog(message = '') {
    if (this.isRemoteExchange) {
      return;
    }
    this.dialogsFormService.openDialogsForm(
      $localize`Add Voice`,
      [ { name: 'message', placeholder: $localize`Your Voice`, type: 'markdown', required: true, imageGroup: 'community' } ],
      { message: [ message, CustomValidators.requiredMarkdown ] },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) }
    );
  }

  postMessage(message) {
    if (this.isRemoteExchange) {
      return;
    }
    this.newsService.postNews({
      viewIn: [ { _id: this.teamId, section: 'community' } ],
      messageType: 'sync',
      messagePlanetCode: this.configuration.code,
      ...message
    }, $localize`Message has been posted successfully`).pipe(
      switchMap(() => forkJoin([
        this.usersService.getAllUsers(),
        this.couchService.findAll('notifications', findDocuments({ status: 'unread', type: 'communityMessage' }))
      ])),
      switchMap(([ users, notifications ]: [ any[], any[] ]) => {
        const docs = users.filter(user => (
          this.user._id !== user._id &&
          user._id !== 'satellite' &&
          notifications.every(notification => notification.user !== user._id)
        )).map(user => this.sendNotifications(user._id, this.user._id));
        return this.couchService.updateDocument('notifications/_bulk_docs', { docs });
      }),
      finalize(() => this.dialogsLoadingService.stop()),
      takeUntil(this.onDestroy$)
    ).subscribe(() => {
      this.dialogsFormService.closeDialogsForm();
      const challenge = this.challengesService.getActiveChallenge();
      if (
        challenge &&
        this.userStatusService.getStatus('joinedCourse') &&
        this.userStatusService.getStatus('surveyComplete') &&
        !this.userStatusService.getStatus('hasPost')
      ) {
        this.dialog.open(DialogsAnnouncementSuccessComponent, {
          width: '50vw',
          maxHeight: '100vh',
          data: challenge
        });
        this.userStatusService.updateStatus(
          'hasPost',
          { status: true, amount: challenge.voicePostReward ?? 2 }
        );
      }
    });
  }

  sendNotifications(user, currentUser) {
    return {
      user,
      message: $localize`<b>${currentUser.split(':')[1]}</b> posted a <b>new story</b>.`,
      link: '/',
      type: 'communityMessage',
      priority: 1,
      status: 'unread',
      time: this.couchService.datePlaceholder,
      planetCode: user.userPlanetCode
    };
  }

  teamObject(planetCode?: string) {
    const code = planetCode || this.stateService.configuration.code;
    const parentCode = planetCode ? this.stateService.configuration.code : this.stateService.configuration.parentCode;
    const teamId = `${code}@${parentCode}`;
    return { _id: teamId, teamType: 'sync', teamPlanetCode: code, type: 'services' };
  }

  getLinks(planetCode?) {
    return this.teamsService.getTeamMembers(this.team || this.teamObject(planetCode), true).pipe(map((docs) => {
      const { link: links, transaction: finances, report: reports } = docs.reduce((docObject, doc) => {
        if (!docObject[doc.docType]) {
          docObject[doc.docType] = [];
        }
        docObject[doc.docType].push(doc);
        return docObject;
      }, { link: [], transaction: [], report: [] });
      return { links, finances, reports };
    }));
  }

  setLinksAndFinances({ links, finances, reports }) {
    this.links = (links || []).map(link => ({
      ...link,
      // for backward compatibility, some old links might have 'web' as icon instead of 'website'
      icon: link.icon === 'web' ? 'website' : link.icon
    }));
    this.deleteMode = this.deleteMode && this.links.length !== 0;
    this.finances = finances;
    this.reports = reports;
    this.communityDataLoading = false;
  }

  dataChanged() {
    this.getLinks().subscribe(res => this.setLinksAndFinances(res));
  }

  setCouncillors(users) {
    const planetCode = this.planetCode ? this.planetCode : this.stateService.configuration.code;
    const councillorUsers = users
      .filter(user => planetCode === user.doc.planetCode && (user.doc.isUserAdmin || user.doc.roles.indexOf('leader')) !== -1);
    const attachmentIds = councillorUsers
      .map(user => `org.couchdb.user:${user.doc.name}@${user.doc.planetCode}`)
      .filter(id => !!id);

    this.fetchMissingAttachments(attachmentIds).pipe(take(1)).subscribe(() => {
      this.councillors = councillorUsers.map(user => {
        const { _id: userId, planetCode: userPlanetCode, name } = user.doc;
        const attachmentId = `org.couchdb.user:${name}@${userPlanetCode}`;
        const attachmentDoc: any = this.attachmentMap[attachmentId];
        const avatar = attachmentDoc ?
          `${environment.couchAddress}/attachments/${attachmentId}/${Object.keys(attachmentDoc._attachments)[0]}` :
          (user.imageSrc || 'assets/image.png');
        return { avatar, userDoc: user, userId, name: user.doc.name, userPlanetCode: user.doc.planetCode, ...user };
      });
    });
  }

  private fetchMissingAttachments(ids: string[]) {
    const missing = ids.filter(id => !this.attachmentMap[id]);
    if (missing.length === 0) {
      return of(undefined);
    }
    return this.couchService.findAttachmentsByIds(missing).pipe(
      tap((attachments: any[]) => {
        attachments.forEach(attachment => {
          this.attachmentMap[attachment._id] = attachment;
        });
      }),
      map(() => undefined)
    );
  }

  openAddLinkDialog() {
    if (this.isRemoteExchange) {
      return;
    }
    this.dialog.open(CommunityLinkDialogComponent, {
      width: '50vw',
      maxHeight: '90vh',
      data: {
        getLinks: () => this.getLinks().pipe(tap(res => this.setLinksAndFinances(res))),
        excludeIds: this.links.map(link => link.linkId || link.route.replace('/teams/view/', '').replace('/enterprises/view/', ''))
      }
    });
  }

  openDeleteLinkDialog(link) {
    if (this.isRemoteExchange) {
      return;
    }
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.couchService.updateDocument('teams', { ...link, _deleted: true }).pipe(switchMap(() => this.getLinks())),
          onNext: (res) => {
            this.setLinksAndFinances(res);
            this.planetMessageService.showMessage($localize` Deleted link: ${link.title}`);
            deleteDialog.close();
          },
          onError: () => this.planetMessageService.showAlert($localize`There was an error deleting ${link.title}`)
        },
        changeType: 'delete',
        type: 'link',
        displayName: link.title
      }
    });
  }

  confirmDeleteDescription() {
    if (this.isRemoteExchange) {
      return;
    }
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.teamsService.updateTeam({ ...this.team, description: null }).pipe(
            switchMap((updatedTeam) => {
              this.team = updatedTeam;
              this.servicesDescriptionLabel = 'Add';
              return of(updatedTeam);
            })
          ),
          onNext: () => {
            this.planetMessageService.showMessage($localize`Description deleted successfully.`);
            deleteDialog.close();
          },
          onError: () => {
            this.planetMessageService.showAlert($localize`There was an error deleting the description.`);
          }
        },
        changeType: 'delete',
        type: 'description',
        displayName: $localize`Community Description`
      }
    });
  }

  toggleShowButton(data) {
    this.activeReplyId = data._id === 'root' ? null : data._id;
    this.showNewsButton = data._id === 'root';
  }

  toggleDeleteMode() {
    if (this.isRemoteExchange) {
      return;
    }
    this.deleteMode = !this.deleteMode;
  }

  openChangeTitleDialog({ member: councillor }) {
    if (this.isRemoteExchange) {
      return;
    }
    this.dialogsFormService.openDialogsForm(
      councillor.doc.leadershipTitle ? $localize`Change Leader Title` : $localize`Add Leader Title`,
      [ { name: 'leadershipTitle', placeholder: $localize`Title`, type: 'textbox' } ],
      { leadershipTitle: councillor.doc.leadershipTitle || '' },
      { autoFocus: true, onSubmit: this.updateTitle(councillor).bind(this) }
    );
  }

  updateTitle(councillor) {
    return ({ leadershipTitle }) => {
      if (leadershipTitle === councillor.doc.leadershipTitle) {
        this.dialogsFormService.closeDialogsForm();
        this.dialogsLoadingService.stop();
        return;
      }
      this.userService.updateUser({ ...councillor.userDoc.doc, leadershipTitle }).pipe(
        finalize(() => this.dialogsLoadingService.stop())
      ).subscribe(() => {
        const msg = !leadershipTitle ?
          $localize`Title deleted` :
          !councillor.doc.leadershipTitle ?
            $localize`Title added` :
            $localize`Title updated`;
        this.dialogsFormService.closeDialogsForm();
        this.planetMessageService.showMessage(msg);
        this.usersService.requestUsers();
      });
    };
  }

  openDescriptionDialog() {
    if (this.isRemoteExchange) {
      return;
    }
    const formGroup: FormGroup<CommunityDescriptionForm> = this.fb.group({
      description: this.fb.control(this.team.description || '', { validators: [ CustomValidators.requiredMarkdown ] })
    });

    this.dialogsFormService.openDialogsForm(
      this.team.description ? $localize`Edit Description` : $localize`Add Description`,
      [
        {
          name: 'description',
          placeholder: $localize`Description`,
          type: 'markdown',
          required: true
        }
      ],
      formGroup,
      {
        autoFocus: true,
        onSubmit: ({ description }: { description: string }) => {
          const trimmedDescription = description.trim();

          if (!trimmedDescription) {
            this.planetMessageService.showAlert($localize`Description cannot be empty.`);
            return;
          }

          this.teamsService.updateTeam({ ...this.team, description: trimmedDescription }).pipe(
            finalize(() => this.dialogsLoadingService.stop())
          ).subscribe(newTeam => {
            const previousDescription = !!this.team.description;
            this.team = newTeam;
            this.servicesDescriptionLabel = newTeam.description ? 'Edit' : 'Add';

            const message = previousDescription
              ? $localize`Description edited successfully.`
              : $localize`Description added successfully.`;

            this.dialogsFormService.closeDialogsForm();
            this.planetMessageService.showMessage(message);
          });
        }
      }
    );
  }

  tabChanged({ index }: { index: number }) {
    if (this.currentTab === 0 && index !== 0 && !this.isRemoteExchange) {
      this.lastReplyId = this.activeReplyId;
    }
    if (index === 0 && this.isRemoteExchange) {
      this.activeReplyId = null;
    }
    if (!this.isRemoteExchange) {
      if (index === 0) {
        this.router.navigate([ this.lastReplyId ? `/voices/${this.lastReplyId}` : '' ]);
      } else {
        this.router.navigate([ '' ]);
      }
    }
    this.currentTab = index;
  }

  onLabelFilterChange(label: string): void {
    this.selectedLabel = label;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = this.news;
    if (this.selectedLabel) {
      filtered = filtered.filter(item =>
        (item.doc.labels || []).some(label => voiceLabelsEqual(label, this.selectedLabel))
          || (item.doc.viewIn || []).some(view => view.name && voiceLabelsEqual(view.name, this.selectedLabel))
          || (voiceLabelsEqual(this.selectedLabel, SHARED_CHAT_LABEL) && item.doc.chat === true));
    }
    if (this.voiceSearch) {
      const lower = this.voiceSearch.toLowerCase();
      filtered = filtered.filter(item => {
        if (typeof item.doc.messageLower !== 'string') {
          item.doc.messageLower = (item.doc.message || '').toLowerCase();
        }
        return item.doc.messageLower.includes(lower);
      });
    }
    this.filteredNews = filtered;
  }

  getAvailableLabels(news: any[]): string[] {
    const labels: string[] = [];
    this.viewLabelNames = new Set<string>();
    news.forEach(item => {
      labels.push(...(item.doc.labels || []));
      (item.doc.viewIn || []).forEach(view => {
        if (view.name) {
          labels.push(view.name);
          this.viewLabelNames.add(normalizeVoiceLabel(view.name));
        }
      });
      if (item.doc.chat === true) {
        labels.push(SHARED_CHAT_LABEL);
      }
    });

    return dedupeVoiceLabels(labels);
  }

  getLabelIcon(label: string): string {
    return voiceLabelsEqual(label, SHARED_CHAT_LABEL) ? 'question_answer'
      : this.viewLabelNames.has(normalizeVoiceLabel(label)) ? 'groups'
      : 'label_important';
  }

  get canManageLabels(): boolean {
    return !this.planetCode &&
      (this.isCommunityLeader || this.userService.doesUserHaveRole([ '_admin', 'manager' ]));
  }

  changeLabelsFilter({ label, action }: { label: string, action: 'remove' | 'add' | 'select' }) {
    this.selectedLabel = action === 'select' ?
      this.availableLabels.find(availableLabel => voiceLabelsEqual(availableLabel, label)) || label : '';
    this.applyFilters();
  }

  openManageLabelsDialog() {
    if (this.planetCode) {
      return;
    }
    this.dialog.open(DialogsVoiceLabelsComponent, {
      width: '500px',
      autoFocus: false,
      data: { target: 'community', customLabels: this.customVoiceLabels }
    }).afterClosed().subscribe((updatedLabels?: string[]) => {
      if (updatedLabels) {
        this.customVoiceLabels = updatedLabels;
        this.configuration = { ...this.configuration, customVoiceLabels: updatedLabels };
      }
    });
  }
}
