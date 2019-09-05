import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
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
import { DialogsAddResourcesComponent } from '../shared/dialogs/dialogs-add-resources.component';
import { DialogsAddCoursesComponent } from '../shared/dialogs/dialogs-add-courses.component';
import { environment } from '../../environments/environment';
import { TasksService } from '../tasks/tasks.service';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit, OnDestroy {

  team: any;
  teamId: string;
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
  isRoot = true;
  visits: any = {};
  leader: string;
  planetCode: string;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  mode: 'team' | 'enterprise' = this.route.snapshot.data.mode || 'team';
  readonly dbName = 'teams';
  leaderDialog: any;
  finances: any[];

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
    private stateService: StateService,
    private tasksService: TasksService
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.teamId = params.get('teamId');
      this.initTeam(this.teamId);
    });
    this.tasksService.tasksListener({ [this.dbName]: this.teamId }).subscribe(tasks => {
      this.members = this.members.map(member => ({
        ...member,
        tasks: this.tasksService.sortedTasks(tasks.filter(({ assignee }) => assignee && assignee.userId === member.userId), member.tasks)
      }));
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  initTeam(teamId: string) {
    this.couchService.get(`${this.dbName}/${teamId}`).pipe(
      switchMap(data => {
        this.planetCode = this.stateService.configuration.code;
        this.team = data;
        if (this.team.status === 'archived') {
          this.router.navigate([ '/teams' ]);
          this.planetMessageService.showMessage('This team no longer exists');
        }
        return this.getMembers();
      }),
      switchMap(() => this.userStatus === 'member' ? this.teamsService.teamActivity(this.team, 'teamVisit') : []),
      switchMap(() => this.couchService.findAll('team_activities', findDocuments({ teamId })))
    ).subscribe((activities) => {
      this.reportsService.groupBy(activities, [ 'user' ]).forEach((visit) => {
        this.visits[visit.user] = visit.count;
      });
      this.setStatus(teamId, this.userService.get());
    });
    this.newsService.requestNews({ viewableBy: 'teams', viewableId: teamId });
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
  }

  getMembers() {
    if (this.team === undefined) {
      return of([]);
    }
    return this.teamsService.getTeamMembers(this.team, true).pipe(switchMap((docs: any[]) => {
      const src = (member) => {
        const { attachmentDoc, userId, userPlanetCode, userDoc } = member;
        if (member.attachmentDoc) {
          return `${environment.couchAddress}/attachments/${userId}@${userPlanetCode}/${Object.keys(attachmentDoc._attachments)[0]}`;
        }
        if (member.userDoc && member.userDoc._attachments) {
          return `${environment.couchAddress}/_users/${userId}/${Object.keys(userDoc._attachments)[0]}`;
        }
        return 'assets/image.png';
      };
      const docsWithName = docs.map(mem => ({ ...mem, name: mem.userId && mem.userId.split(':')[1], avatar: src(mem) }));
      this.leader = (docsWithName.find(mem => mem.isLeader) || {}).userId || this.team.createdBy;
      this.members = docsWithName.filter(mem => mem.docType === 'membership')
        .sort((a, b) => a.userId === this.leader ? -1 : 0);
      this.requests = docsWithName.filter(mem => mem.docType === 'request');
      this.disableAddingMembers = this.members.length >= this.team.limit;
      this.finances = docs.filter(doc => doc.docType === 'transaction');
      this.setStatus(this.team, this.userService.get());
      return this.teamsService.getTeamResources(docs.filter(doc => doc.docType === 'resourceLink'));
    }), map(resources => this.resources = resources));
  }

  resetData() {
    this.getMembers().subscribe();
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
  }

  toggleMembership(team, leaveTeam) {
    return this.teamsService.toggleTeamMembership(
      team, leaveTeam,
      this.members.find(doc => doc.userId === this.user._id) || { userId: this.user._id, userPlanetCode: this.user.planetCode }
    ).pipe(
      switchMap((newTeam) => {
        this.team = newTeam;
        return this.getMembers();
      })
    );
  }

  dialogPromptConfig(item, change) {
    return {
      leave: { request: this.toggleMembership(item, true), successMsg: 'left', errorMsg: 'leaving' },
      archive: { request: this.teamsService.archiveTeam(item), successMsg: 'deleted', errorMsg: 'deleting' },
      resource: {
        request: this.removeResource(item), name: item.resource && item.resource.title, successMsg: 'removed', errorMsg: 'removing'
      },
      course: { request: this.removeCourse(item), name: item.courseTitle, successMsg: 'removed', errorMsg: 'removing' },
      remove: {
        request: this.changeMembershipRequest('removed', item), name: (item.userDoc || {}).firstName || item.name,
        successMsg: 'removed', errorMsg: 'removing'
      },
      leader: { request: this.makeLeader(item), successMsg: 'given leadership to', errorMsg: 'giving leadership to' }
    }[change];
  }

  openDialogPrompt(item, change: 'leave' | 'archive' | 'resource' | 'remove' | 'course', dialogParams: { changeType, type }) {
    const config = this.dialogPromptConfig(item, change);
    const displayName = config.name || item.name;
    this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: config.request,
          onNext: (res) => {
            this.dialogPrompt.close();
            this.planetMessageService.showMessage(`You have ${config.successMsg} ${displayName}`);
            this.team = change === 'course' ? res : this.team;
            if (res.status === 'archived') {
              this.router.navigate([ '/teams' ]);
            }
          },
          onError: () => this.planetMessageService.showAlert(`There was a problem ${config.errorMsg} ${displayName}`)
        },
        displayName,
        ...dialogParams
      }
    });
  }

  changeMembershipRequest(type, memberDoc?) {
    const changeObject = this.changeObject(type, memberDoc);
    return changeObject.obs.pipe(
      switchMap(() => type === 'added' ? this.teamsService.removeFromRequests(this.team, memberDoc) : of({})),
      switchMap(() => this.getMembers()),
      switchMap(() => this.sendNotifications('added')),
      map(() => changeObject.message)
    );
  }

  changeMembership(type, memberDoc?) {
    this.changeMembershipRequest(type, memberDoc).subscribe((message) => {
      this.setStatus(this.team, this.userService.get());
      this.planetMessageService.showMessage(message);
    });
  }

  private changeObject(type, memberDoc?) {
    switch (type) {
      case 'request':
        return ({
          obs: this.teamsService.requestToJoinTeam(this.team, this.user),
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
      maxHeight: '500px',
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
    this.couchService.bulkDocs(this.dbName, newMembershipDocs).pipe(
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
    const dialogRef = this.dialog.open(DialogsAddCoursesComponent, {
      width: '80vw',
      data: {
        okClick: (courses: any[]) => {
          courses = courses.map(course => course.doc)
            .sort((a, b) => a.courseTitle.toLowerCase() > b.courseTitle.toLowerCase() ? 1 : -1);
          this.teamsService.updateTeam({ ...this.team, courses: this.team.courses.concat(courses) })
            .subscribe((updatedTeam) => {
              this.team = updatedTeam;
              dialogRef.close();
              this.dialogsLoadingService.stop();
            });
        },
        excludeIds: initialCourses.map(c => c._id)
      }
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

  openResourcesDialog(resource?) {
    const dialogRef = this.dialog.open(DialogsAddResourcesComponent, {
      width: '80vw',
      data: {
        okClick: (resources: any[]) => {
          this.teamsService.linkResourcesToTeam(resources, this.team)
          .pipe(switchMap(() => this.getMembers())).subscribe(() => {
            dialogRef.close();
            this.dialogsLoadingService.stop();
          });
        },
        excludeIds: this.resources.filter(r => r.resource).map(r => r.resource._id),
        canAdd: true, db: this.dbName, linkId: this.teamId, resource
      }
    });
  }

  removeResource(resource) {
    const obs = [ this.couchService.post(this.dbName, { ...resource.linkDoc, _deleted: true }) ];
    if (resource.resource && resource.resource.private === true) {
      const { _id: resId, _rev: resRev } = resource.resource;
      obs.push(this.couchService.delete(`resources/${resId}?rev=${resRev}`));
    }
    return forkJoin(obs).pipe(switchMap(() => this.getMembers()));
  }

  makeLeader(member) {
    const currentLeader = this.members.find(mem => mem.userId === this.leader);
    return this.teamsService.changeTeamLeadership(currentLeader, member).pipe(switchMap(() => this.getMembers()));
  }

  removeCourse(course) {
    if (!this.team.courses) {
      return of(true);
    }
    const index = this.team.courses.indexOf(course);
    const newCourses = this.team.courses.slice(0, index).concat(this.team.courses.slice(index + 1, this.team.courses.length));
    return this.teamsService.updateTeam({ ...this.team, courses: newCourses });
  }

  toggleTask({ option }) {
    this.tasksService.addTask({ ...option.value, completed: option.selected }).subscribe(() => {
      this.tasksService.getTasks();
    });
  }

  goBack() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

}
