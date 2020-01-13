import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
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

@Component({
  templateUrl: './community.component.html',
  styleUrls: [ './community.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class CommunityComponent implements OnInit, OnDestroy {

  configuration = this.stateService.configuration;
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

  constructor(
    private dialog: MatDialog,
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
    this.newsService.requestNews({ createdOn: this.configuration.code, viewableBy: 'community' });
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
    this.usersService.usersUpdated.pipe(takeUntil(this.onDestroy$)).subscribe(users => this.setCouncillors(users));
    this.getLinks();
    this.usersService.requestUsers();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  openAddMessageDialog(message = '') {
    this.dialogsFormService.openDialogsForm(
      'Add Story',
      [ { name: 'message', placeholder: 'Your Story', type: 'markdown', required: true, imageGroup: 'community' } ],
      { message },
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
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => this.dialogsFormService.closeDialogsForm());
  }

  getLinks() {
    this.teamsService.getTeamMembers(this.team, true).subscribe((docs) => {
      const { link: links, transaction: finances } = docs.reduce((docObject, doc) => ({
        ...docObject, [doc.docType]: [ ...(docObject[doc.docType] || []), doc ]
      }));
      this.links = links;
      this.finances = finances;
    });
  }

  setCouncillors(users) {
    this.councillors = users.filter(user => user.doc.isUserAdmin || user.doc.roles.indexOf('leader') !== -1)
      .map(user => ({ avatar: user.imageSrc || 'assets/image.png', userDoc: user.doc, userId: user._id, ...user }));
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
