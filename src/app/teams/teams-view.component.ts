import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, finalize, map } from 'rxjs/operators';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NewsService } from '../news/news.service';
import { findDocuments } from '../shared/mangoQueries';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit, OnDestroy {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = [];
  requests = [];
  disableAddingMembers = false;
  displayedColumns = [ 'name' ];
  userStatus = 'unrelated';
  onDestroy$ = new Subject<void>();
  currentUserId = this.userService.get()._id;
  dialogRef: MatDialogRef<DialogsListComponent>;
  user = this.userService.get();
  news: any[] = [];
  resources: any[] = [];
  leftTileContent: 'description' | 'news';
  isRoot = true;
  visits: any = {};
  leader: string;
  planetCode: string;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    private dialogsListService: DialogsListService,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsFormService: DialogsFormService,
    private newsService: NewsService,
    private reportsService: ReportsService,
    private stateService: StateService
  ) {}

  ngOnInit() {
    this.couchService.get('teams/' + this.teamId).pipe(
      switchMap(data => {
        this.planetCode = this.stateService.configuration.code;
        this.team = data;
        return this.getMembers();
      }),
      switchMap(() => this.userStatus === 'member' ? this.teamsService.teamActivity(this.team, 'teamVisit') : []),
      switchMap(() => this.couchService.findAll('team_activities', findDocuments({ teamId: this.team._id })))
    ).subscribe((activities) => {
      this.reportsService.groupBy(activities, [ 'user' ]).forEach((visit) => {
        this.visits[visit.user] = visit.count;
      });
      this.setStatus(this.team, this.userService.get());
    });
    this.newsService.requestNews({ viewableBy: 'teams', viewableId: this.teamId });
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getMembers() {
    if (this.team === undefined) {
      return [];
    }
    return this.teamsService.getTeamMembers(this.team, true).pipe(switchMap((docs: any[]) => {
      const docsWithName = docs.map(mem => ({ ...mem, name: mem.userId && mem.userId.split(':')[1] }));
      this.members = docsWithName.filter(mem => mem.docType === 'membership')
        .sort((a, b) => a.userId === this.team.createdBy ? -1 : 0);
      this.requests = docsWithName.filter(mem => mem.docType === 'request');
      this.leader = this.team.createdBy;
      this.disableAddingMembers = this.members.length >= this.team.limit;
      this.setStatus(this.team, this.userService.get());
      return this.teamsService.getTeamResources(docs.filter(doc => doc.docType === 'resourceLink'));
    }), map(resources => this.resources = resources));
  }

  toggleAdd(data) {
    this.isRoot = data._id === 'root';
  }

  setStatus(team, user) {
    this.userStatus = 'unrelated';
    if (team === undefined) {
      return;
    }
    this.userStatus = this.requests.some((req: any) => req.userId === user._id) ? 'requesting' : this.userStatus;
    this.userStatus = this.members.some((req: any) => req.userId === user._id) ? 'member' : this.userStatus;
    this.leftTileContent = this.userStatus === 'member' ? 'news' : 'description';
  }

  toggleMembership(team, leaveTeam) {
    this.teamsService.toggleTeamMembership(
      team, leaveTeam,
      this.members.find(doc => doc.userId === this.user._id) || { userId: this.user._id, userPlanetCode: this.user.planetCode }
    ).pipe(
      switchMap((newTeam) => {
        this.team = newTeam;
        return this.getMembers();
      })
    ).subscribe(() => {
      const msg = leaveTeam ? 'left' : 'joined';
      if (this.team.status === 'archived') {
        this.router.navigate([ '/teams' ]);
      }
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

  changeMembership(type, memberDoc?) {
    const changeObject = this.changeObject(type, memberDoc);
    changeObject.obs.pipe(
      switchMap(() => type === 'added' ? this.teamsService.removeFromRequests(this.team, memberDoc) : of({})),
      switchMap(() => this.getMembers()),
      switchMap(() => this.sendNotifications('added'))
    ).subscribe(() => {
      this.setStatus(this.team, this.userService.get());
      this.planetMessageService.showMessage(changeObject.message);
    });
  }

  private changeObject(type, memberDoc?) {
    switch (type) {
      case 'request':
        return ({
          obs: this.teamsService.requestToJoinTeam(this.team, this.user._id),
          message: 'Request to join team sent'
        });
      case 'removed':
        return ({
          obs: this.teamsService.toggleTeamMembership(this.team, true, memberDoc),
          message: memberDoc.name + ' removed from team'
        });
      case 'added':
        return ({
          obs: this.teamsService.toggleTeamMembership(this.team, false, memberDoc),
          message: memberDoc.name + ' accepted'
        });
      case 'rejected':
        return ({
          obs: this.teamsService.removeFromRequests(this.team, memberDoc),
          message: memberDoc.name + ' rejected'
        });
    }
  }

  openDialog(data) {
    this.dialogRef = this.dialog.open(DialogsListComponent, {
      data,
      height: '500px',
      width: '600px',
      autoFocus: false
    });
  }

  updateTeam() {
    this.teamsService.addTeamDialog(this.user._id, this.team).subscribe((updatedTeam) => {
      this.team = updatedTeam;
      this.planetMessageService.showMessage(this.team.name + ' updated successfully');
    });
  }

  openInviteMemberDialog() {
    this.dialogsListService.getListAndColumns('_users').pipe(takeUntil(this.onDestroy$)).subscribe((res) => {
      res.tableData = res.tableData.filter((user: any) => this.members.findIndex((member) => member.name === user.name) === -1);
      const data = {
        okClick: this.addMembers.bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        allowMulti: true,
        itemDescription: 'members',
        nameProperty: 'name',
        ...res
      };
      this.openDialog(data);
    });
  }

  addMembers(selected: any[]) {
    const newMembershipDocs = selected.map(
      user => this.teamsService.membershipProps(this.team, { userId: user._id, userPlanetCode: user.planetCode }, 'membership')
    );
    this.couchService.bulkDocs('teams', newMembershipDocs).pipe(
      switchMap(() => {
        return forkJoin([
          this.teamsService.sendNotifications('added', selected, {
            url: this.router.url, team: { ...this.team }
          }),
          this.sendNotifications('addMember', { newMembersLength: selected.length })
        ]);
      }),
      switchMap(() => this.getMembers())
    ).subscribe(() => {
      this.dialogRef.close();
      this.planetMessageService.showMessage('Member' + (selected.length > 1 ? 's' : '') + ' added successfully');
    });
  }

  sendNotifications(type, { members, newMembersLength = 0 }: { members?, newMembersLength? } = {}) {
    return this.teamsService.sendNotifications(type, members || this.members, {
      newMembersLength, url: this.router.url, team: { ...this.team }
    });
  }

  openCourseDialog() {
    const initialCourses = this.team.courses || [];
    this.dialogsLoadingService.start();
    this.dialogsListService.attachDocsData('courses', 'courseTitle', this.linkCourses.bind(this), initialCourses.map(({ _id }) => _id))
    .pipe(takeUntil(this.onDestroy$)).subscribe((data) => {
      if (this.dialogRef === undefined || this.dialogRef.componentInstance === null) {
        this.openDialog(data);
      }
      this.dialogsLoadingService.stop();
    });
  }

  linkCourses(courses) {
    courses.sort((a, b) => a.courseTitle.toLowerCase() > b.courseTitle.toLowerCase() ? 1 : -1);
    this.teamsService.updateTeam({ ...this.team, courses }).subscribe((updatedTeam) => {
      this.team = updatedTeam;
      this.dialogRef.close();
    });
  }

  openAddMessageDialog(message = '') {
    this.dialogsFormService.openDialogsForm(
      'Add message', [ { name: 'message', placeholder: 'Message', type: 'markdown', required: true } ], { message },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) }
    );
  }

  postMessage(message) {
    this.newsService.postNews({
      viewableBy: 'teams',
      viewableId: this.teamId,
      messageType: this.team.teamType,
      messagePlanetCode: this.team.teamPlanetCode,
      ...message
    }, 'Message has been posted successfully')
    .pipe(switchMap(() => this.sendNotifications('message')))
    .pipe(finalize(() => this.dialogsLoadingService.stop())).subscribe(() => { this.dialogsFormService.closeDialogsForm(); });
  }

  changeLeftTile() {
    this.leftTileContent = this.leftTileContent === 'news' ? 'description' : 'news';
  }

  openResourcesDialog(resource?) {
    const dialogRef = this.dialog.open(DialogsAddResourcesComponent, {
      width: '80vw',
      data: {
        okClick: (resources: any[]) => this.teamsService.linkResourcesToTeam(resources, this.team)
          .pipe(switchMap(() => this.getMembers())).subscribe(() => dialogRef.close()),
        excludeIds: this.resources.map(r => r.resource._id),
        canAdd: true, db: 'teams', linkId: this.teamId, resource
      }
    });
  }

  removeResource(resource) {
    this.couchService.post('teams', { ...resource.linkDoc, _deleted: true }).pipe(switchMap(() => this.getMembers()))
      .subscribe(() => this.planetMessageService.showMessage(`${resource.resource.title} removed`));
  }

}
