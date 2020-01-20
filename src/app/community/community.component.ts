import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, finalize, switchMap } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { NewsService } from '../news/news.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { MatDialog } from '@angular/material';
import { CommunityLinkDialogComponent } from './community-link-dialog.component';
import { TeamsService } from '../teams/teams.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { UsersService } from '../users/users.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { CustomValidators } from '../validators/custom-validators';
import { environment } from '../../environments/environment';

@Component({
  selector: 'planet-community',
  templateUrl: './community.component.html',
  styleUrls: [ './community.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class CommunityComponent implements OnInit, OnDestroy {

  configuration: any = {};
  teamId = `${this.stateService.configuration.code}@${this.stateService.configuration.parentCode}`;
  team = { _id: this.teamId, teamType: 'sync', teamPlanetCode: this.stateService.configuration.code, type: 'services' };
  user = this.userService.get();
  news: any[] = [];
  links: any[] = [];
  finances: any[] = [];
  councillors: any[] = [];
  showNewsButton = true;
  deleteMode = false;
  onDestroy$ = new Subject<void>();
  isCommunityLeader = this.user.isUserAdmin || this.user.roles.indexOf('leader') > -1;
  planetCode: string | null;

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
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        this.planetCode = params.get('code');
        this.getCommunityData(this.planetCode);
        this.getLinks(this.planetCode);
        if (this.planetCode) {
          return this.couchService.findAll('communityregistrationrequests', { selector: { code: this.planetCode } });
        }
        return of([ this.stateService.configuration ]);
      })
    ).subscribe(configurations => this.configuration = configurations[0]);
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
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
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getCommunityData(planetCode?: string) {
    if (planetCode) {
      this.newsService.requestNews({ createdOn: planetCode, viewableBy: 'community' });
      this.stateService.requestData('child_users', 'local');
      return;
    }
    this.newsService.requestNews({ createdOn: this.configuration.code, viewableBy: 'community' });
    this.usersService.requestUsers();
  }

  openAddMessageDialog(message = '') {
    this.dialogsFormService.openDialogsForm(
      'Add Story',
      [ { name: 'message', placeholder: 'Your Story', type: 'markdown', required: true, imageGroup: 'community' } ],
      { message: [ message, CustomValidators.requiredMarkdown ] },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) }
    );
  }

  postMessage(message) {
    this.newsService.postNews({
      viewableBy: 'community',
      messageType: 'sync',
      messagePlanetCode: this.configuration.code,
      ...message
    }, 'Message has been posted successfully').pipe(
      switchMap(() => forkJoin([
        this.usersService.getAllUsers(),
        this.couchService.findAll('notifications', findDocuments({ status: 'unread', type: 'communityMessage' }))
      ])),
      switchMap(([ users, notifications ]: [ any[], any[] ]) => {
        const currentUser = this.userService.get();
        const docs = users.filter(user => {
          return currentUser._id !== user._id &&
            user._id !== 'satellite' &&
            notifications.every(notification => notification.user !== user._id);
        }).map(user => this.sendNotifications(user._id, currentUser._id));
        return this.couchService.updateDocument('notifications/_bulk_docs', { docs });
      }),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => this.dialogsFormService.closeDialogsForm());
  }

  sendNotifications(user, currentUser) {
    return {
      'user': user,
      'message': `<b>${currentUser.split(':')[1]}</b> posted a <b>new story</b>.`,
      'link': 'community/',
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
    const team = this.teamObject(planetCode);
    this.teamId = team._id;
    this.team = team;
    this.teamsService.getTeamMembers(team, true).subscribe((docs) => {
      const { link: links, transaction: finances } = docs.reduce((docObject, doc) => ({
        ...docObject, [doc.docType]: [ ...(docObject[doc.docType] || []), doc ]
      }), { link: [], transaction: [] });
      this.links = links;
      this.finances = finances;
    });
  }

  setCouncillors(users) {
    this.couchService.findAll('attachments').subscribe((attachments: any[]) => {
      this.councillors = users.filter(user => user.doc.isUserAdmin || user.doc.roles.indexOf('leader') !== -1).map(user => {
        const { _id: userId, planetCode: userPlanetCode, name } = user.doc;
        const attachmentId = `org.couchdb.user:${name}@${userPlanetCode}`;
        const attachmentDoc: any = attachments.find(attachment => attachment._id === attachmentId);
        const avatar = attachmentDoc ?
          `${environment.couchAddress}/attachments/${attachmentId}/${Object.keys(attachmentDoc._attachments)[0]}` :
          (user.imageSrc || 'assets/image.png');
        return { avatar, userDoc: user.doc, userId, name: user.doc.name, ...user };
      });
    });
  }

  deleteLink(link) {
    return this.couchService.delete(`teams/${link._id}?rev=${link._rev}`);
  }

  openAddLinkDialog() {
    this.dialog.open(CommunityLinkDialogComponent, {
      width: '50vw',
      maxHeight: '90vh',
      data: {
        getLinks: this.getLinks.bind(this),
        excludeIds: this.links.map(link => link.linkId || link.route.replace('/teams/view/', '').replace('/enterprises/view/', ''))
      }
    });
  }

  openDeleteLinkDialog(link) {
    const deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.deleteLink(link),
          onNext: () => {
            this.planetMessageService.showMessage(`${link.title} deleted`);
            this.getLinks();
            deleteDialog.close();
          },
          onError: () => this.planetMessageService.showAlert(`There was an error deleting ${link.title}`)
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
      'Change Leader Title',
      [ { name: 'leadershipTitle', placeholder: 'Title', type: 'textbox', required: true } ],
      { leadershipTitle: councillor.userDoc.leadershipTitle || '' },
      { autoFocus: true, onSubmit: this.updateTitle(councillor).bind(this) }
    );
  }

  updateTitle(councillor) {
    return ({ leadershipTitle }) => {
      this.userService.updateUser({ ...councillor.userDoc, leadershipTitle }).pipe(
        finalize(() => this.dialogsLoadingService.stop())
      ).subscribe(() => {
        this.dialogsFormService.closeDialogsForm();
        this.planetMessageService.showMessage('Title updated');
        this.usersService.requestUsers();
      });
    };
  }

}
