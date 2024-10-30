import { Component, OnInit, OnDestroy, ViewEncapsulation, HostListener } from '@angular/core';
import { Subject, forkJoin, of, throwError } from 'rxjs';
import { takeUntil, finalize, switchMap, map, catchError, tap } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { NewsService } from '../news/news.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { MatDialog } from '@angular/material/dialog';
import { CommunityLinkDialogComponent } from './community-link-dialog.component';
import { TeamsService } from '../teams/teams.service';
import { DialogsAnnouncementComponent } from '../shared/dialogs/dialogs-announcement.component';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { UsersService } from '../users/users.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CustomValidators } from '../validators/custom-validators';
import { environment } from '../../environments/environment';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  selector: 'planet-community',
  templateUrl: './community.component.html',
  preserveWhitespaces: true,
  styleUrls: [ './community.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class CommunityComponent implements OnInit, OnDestroy {

  configuration: any = {};
  teamId = planetAndParentId(this.stateService.configuration);
  team: any = { _id: this.teamId, teamType: 'sync', teamPlanetCode: this.stateService.configuration.code, type: 'services' };
  user = this.userService.get();
  news: any[] = [];
  links: any[] = [];
  finances: any[] = [];
  councillors: any[] = [];
  reports: any[] = [];
  showNewsButton = true;
  deleteMode = false;
  onDestroy$ = new Subject<void>();
  isCommunityLeader = this.user.isUserAdmin || this.user.roles.indexOf('leader') > -1;
  planetCode: string | null;
  shareTarget: string;
  servicesDescriptionLabel: 'Add' | 'Edit';
  resizeCalendar: any = false;
  deviceType: DeviceType;
  deviceTypes = DeviceType;
  challengeActive: boolean;

  constructor(
    private dialog: MatDialog,
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
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    const newsSortValue = (item: any) => item.sharedDate || item.doc.time;
    this.getCommunityData();
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => {
      this.news = news.sort((a, b) => newsSortValue(b) - newsSortValue(a));
    });
    this.usersService.usersListener(true).pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      if (!this.planetCode) {
        this.setCouncillors(users);
      }
    });
    this.stateService.couchStateListener('child_users').pipe(takeUntil(this.onDestroy$)).subscribe(childUsers => {
      if (this.planetCode && childUsers) {
        const users = childUsers.newData.filter(user => user.planetCode === this.planetCode).map(user => ({ ...user, doc: user }));
        this.setCouncillors(users);
      }
    });
    this.communityChallenge();
  }

  @HostListener('window:resize') onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  communityChallenge() {
    const excludedCodes = ['earth', 'somalia', 'learning'];
    this.challengeActive = !excludedCodes.includes(this.configuration.code) && new Date().getMonth() === 9;
    if (this.challengeActive) {
      this.openAnnouncementDialog();
    }
  }

  getCommunityData() {
    const setShareTarget = (type) => type === 'center' ? 'nation' : type === 'nation' ? 'community' : undefined;
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.planetCode = params.get('code');
        this.shareTarget = this.planetCode ? undefined : setShareTarget(this.stateService.configuration.planetType);
        return this.planetCode ?
          this.couchService.findAll('communityregistrationrequests', { selector: { code: this.planetCode } }) :
          of([ this.stateService.configuration ]);
      }),
      switchMap(configurations => {
        this.configuration = configurations[0];
        this.team = this.teamObject(this.planetCode);
        this.teamId = this.team._id;
        this.requestNewsAndUsers(this.planetCode);
        return this.getLinks(this.planetCode);
      }),
      switchMap((res) => {
        this.setLinksAndFinances(res);
        return this.couchService.get(`teams/${this.teamId}`);
      }),
      catchError(err => err.statusText === 'Object Not Found' ? of(this.team) : throwError(err))
    ).subscribe(team => {
      this.team = team;
      this.servicesDescriptionLabel = this.team.description ? 'Edit' : 'Add';
    });
  }

  requestNewsAndUsers(planetCode?: string) {
    this.newsService.requestNews({
      selectors: {
        '$or': [
          { messagePlanetCode: planetCode ? planetCode : this.configuration.code, viewableBy: 'community' },
          { viewIn: { '$elemMatch': { '_id': this.teamId, section: 'community' } } }
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

  openAnnouncementDialog() {
    this.dialog.open(DialogsAnnouncementComponent, {
      width: '50vw',
      maxHeight: '100vh'
    });
  }

  openAddMessageDialog(message = '') {
    this.dialogsFormService.openDialogsForm(
      $localize`Add Voice`,
      [ { name: 'message', placeholder: $localize`Your Voice`, type: 'markdown', required: true, imageGroup: 'community' } ],
      { message: [ message, CustomValidators.requiredMarkdown ] },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) }
    );
  }

  postMessage(message) {
    this.newsService.postNews({
      viewIn: [ { '_id': this.teamId, section: 'community' } ],
      messageType: 'sync',
      messagePlanetCode: this.configuration.code,
      ...message
    }, $localize`Message has been posted successfully`).pipe(
      switchMap(() => forkJoin([
        this.usersService.getAllUsers(),
        this.couchService.findAll('notifications', findDocuments({ status: 'unread', type: 'communityMessage' }))
      ])),
      switchMap(([ users, notifications ]: [ any[], any[] ]) => {
        const docs = users.filter(user => {
          return this.user._id !== user._id &&
            user._id !== 'satellite' &&
            notifications.every(notification => notification.user !== user._id);
        }).map(user => this.sendNotifications(user._id, this.user._id));
        return this.couchService.updateDocument('notifications/_bulk_docs', { docs });
      }),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => this.dialogsFormService.closeDialogsForm());
  }

  sendNotifications(user, currentUser) {
    return {
      'user': user,
      'message': $localize`<b>${currentUser.split(':')[1]}</b> posted a <b>new story</b>.`,
      'link': '/',
      'type': 'communityMessage',
      'priority': 1,
      'status': 'unread',
      'time': this.couchService.datePlaceholder,
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
      const { link: links, transaction: finances, report: reports } = docs.reduce((docObject, doc) => ({
        ...docObject, [doc.docType]: [ ...(docObject[doc.docType] || []), doc ]
      }), { link: [], transaction: [] });
      return { links, finances, reports };
    }));
  }

  setLinksAndFinances({ links, finances, reports }) {
    this.links = links;
    this.deleteMode = this.deleteMode && this.links.length !== 0;
    this.finances = finances;
    this.reports = reports;
  }

  dataChanged() {
    this.getLinks().subscribe(res => this.setLinksAndFinances(res));
  }

  setCouncillors(users) {
    const planetCode = this.planetCode ? this.planetCode : this.stateService.configuration.code;
    this.couchService.findAll('attachments').subscribe((attachments: any[]) => {
      this.councillors = users
        .filter(user => planetCode === user.doc.planetCode && (user.doc.isUserAdmin || user.doc.roles.indexOf('leader')) !== -1)
        .map(user => {
          const { _id: userId, planetCode: userPlanetCode, name } = user.doc;
          const attachmentId = `org.couchdb.user:${name}@${userPlanetCode}`;
          const attachmentDoc: any = attachments.find(attachment => attachment._id === attachmentId);
          const avatar = attachmentDoc ?
            `${environment.couchAddress}/attachments/${attachmentId}/${Object.keys(attachmentDoc._attachments)[0]}` :
            (user.imageSrc || 'assets/image.png');
          return { avatar, userDoc: user, userId, name: user.doc.name, userPlanetCode: user.doc.planetCode, ...user };
        });
    });
  }

  openAddLinkDialog() {
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
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.couchService.updateDocument('teams', { ...link, _deleted: true }).pipe(switchMap(() => this.getLinks())),
          onNext: (res) => {
            this.setLinksAndFinances(res);
            this.planetMessageService.showMessage($localize`${link.title} deleted`);
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

  toggleShowButton(data) {
    this.showNewsButton = data._id === 'root';
  }

  toggleDeleteMode() {
    this.deleteMode = !this.deleteMode;
  }

  openChangeTitleDialog({ member: councillor }) {
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
    const submitDescription = ({ description }) => {
      this.teamsService.updateTeam({ ...this.team, description: description.text }).pipe(
        finalize(() => this.dialogsLoadingService.stop())
      ).subscribe(newTeam => {
        this.team = newTeam;
        this.servicesDescriptionLabel = newTeam.description ? 'Edit' : 'Add';
      });
      this.dialogsFormService.closeDialogsForm();
    };
    this.dialogsFormService.openDialogsForm(
      this.team.description ? $localize`Edit Description` : $localize`Add Description`,
      [ { name: 'description', placeholder: $localize`Description`, type: 'markdown', required: true, imageGroup: 'community' } ],
      { description: this.team.description || '' },
      { autoFocus: true, onSubmit: submitDescription }
    );
  }

  tabChanged({ index }) {
    if (index === 5) {
      this.resizeCalendar = true;
    } else {
      this.resizeCalendar = false;
    }
  }
}
