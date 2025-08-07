import { Component, OnInit, OnDestroy, ViewChild, AfterViewChecked, ViewEncapsulation, HostListener } from '@angular/core';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyTab as MatTab } from '@angular/material/legacy-tabs';
import { Subject, forkJoin, of, throwError } from 'rxjs';
import { takeUntil, switchMap, finalize, map, tap, catchError } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NewsService } from '../news/news.service';
import { findDocuments } from '../shared/mangoQueries';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { StateService } from '../shared/state.service';
import { DialogsAddResourcesComponent } from '../shared/dialogs/dialogs-add-resources.component';
import { DialogsAddTableComponent } from '../shared/dialogs/dialogs-add-table.component';
import { environment } from '../../environments/environment';
import { TasksService } from '../tasks/tasks.service';
import { DialogsResourcesViewerComponent } from '../shared/dialogs/dialogs-resources-viewer.component';
import { CustomValidators } from '../validators/custom-validators';
import { planetAndParentId } from '../manager-dashboard/reports/reports.utils';
import { CoursesViewDetailDialogComponent } from '../courses/view-courses/courses-view-detail.component';
import { memberCompare, memberSort } from './teams.utils';
import { UserProfileDialogComponent } from '../users/users-profile/users-profile-dialog.component';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class TeamsViewComponent implements OnInit, AfterViewChecked, OnDestroy {

  @ViewChild('taskTab') taskTab: MatTab;
  @ViewChild('applicantTab') applicantTab: MatTab;
  team: any;
  teamId: string;
  members = [];
  requests = [];
  disableAddingMembers = false;
  displayedColumns = [ 'name' ];
  userStatus = 'unrelated';
  isUserLeader = false;
  onDestroy$ = new Subject<void>();
  currentUserId = this.userService.get()._id;
  dialogRef: MatDialogRef<DialogsAddTableComponent>;
  user = this.userService.get();
  news: any[] = [];
  resources: any[] = [];
  isRoot = true;
  visits: any = {};
  leader: any = {};
  planetCode: string;
  dialogPrompt: MatDialogRef<DialogsPromptComponent>;
  mode: 'team' | 'enterprise' | 'services' = this.route.snapshot.data.mode || 'team';
  readonly dbName = 'teams';
  leaderDialog: any;
  finances: any[] = [];
  reports: any[] = [];
  tasks: any[];
  tabSelectedIndex = 0;
  initTab;
  taskCount = 0;
  reportsCount = 0;
  financesCount = 0;
  configuration = this.stateService.configuration;
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    private dialogsLoadingService: DialogsLoadingService,
    private dialogsFormService: DialogsFormService,
    private newsService: NewsService,
    private reportsService: ReportsService,
    private stateService: StateService,
    private tasksService: TasksService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    this.planetCode = this.stateService.configuration.code;
    this.route.paramMap.subscribe((params: ParamMap) => {
      this.teamId = params.get('teamId') || planetAndParentId(this.stateService.configuration);
      this.initTeam(this.teamId);
    });
    this.tasksService.tasksListener({ [this.dbName]: this.teamId }).subscribe(tasks => {
      this.tasks = tasks;
      this.setTasks(tasks);
    });
  }

  ngAfterViewChecked() {
    const activeTab: MatTab = this.getActiveTab(this.initTab);
    if (activeTab && activeTab.position !== 0) {
      setTimeout(() => {
        this.tabSelectedIndex = this.tabSelectedIndex + activeTab.position;
        this.initTab = activeTab.position === 0 ? '' : this.initTab;
      }, 0);
    }
  }

  getActiveTab(initTab: string) {
    const activeTabs = {
      'taskTab': this.taskTab,
      'applicantTab': this.applicantTab
    };
    return activeTabs[initTab];
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getTeam(teamId: string) {
    return this.couchService.get(`${this.dbName}/${teamId}`).pipe(tap((data) => this.team = data));
  }

  initTeam(teamId: string) {
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$))
      .subscribe(news => this.news = news.map(post => ({
        ...post, public: ((post.doc.viewIn || []).find(view => view._id === teamId) || {}).public
      })));
    if (this.mode === 'services') {
      this.initServices(teamId);
      return;
    }
    this.getTeam(teamId).pipe(
      catchError(err => {
        this.goBack(true);
        return throwError(err);
      }),
      switchMap(() => {
        if (this.team.status === 'archived') {
          this.goBack(true);
        }
        return this.getMembers();
      }),
      switchMap(() => this.userStatus === 'member' ? this.teamsService.teamActivity(this.team, 'teamVisit') : of([])),
      switchMap(() => this.couchService.findAll('team_activities', findDocuments({ teamId })))
    ).subscribe((activities) => {
      this.reportsService.groupBy(activities, [ 'user' ], { maxField: 'time' }).forEach((visit) => {
        this.visits[visit.user] = { count: visit.count, recentTime: visit.max && visit.max.time };
      });
      this.setStatus(teamId, this.leader, this.userService.get());
      this.requestTeamNews(teamId);
    });
  }

  initServices(teamId) {
    this.getTeam(teamId).pipe(
      catchError(() => this.teamsService.createServicesDoc()),
      switchMap(team => {
        this.team = team;
        return this.getMembers();
      })
    ).subscribe(() => {
      this.leader = {};
      this.userStatus = 'member';
    });
  }

  requestTeamNews(teamId) {
    const showAll = this.userStatus === 'member' || this.team.public === true;
    this.newsService.requestNews({
      selectors: {
        '$or': [
          ...(showAll ? [ { viewableBy: 'teams', viewableId: teamId } ] : []),
          {
            viewIn: { '$elemMatch': {
              '_id': teamId, section: 'teams', ...(showAll ? {} : { public: true })
            } }
          }
        ],
      },
      viewId: teamId
    });
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
        if (member.userDoc && member.userDoc.doc._attachments) {
          return `${environment.couchAddress}/_users/${userId}/${Object.keys(userDoc.doc._attachments)[0]}`;
        }
        return 'assets/image.png';
      };
      const docsWithName = docs.map(mem => ({ ...mem, name: mem.userId && mem.userId.split(':')[1], avatar: src(mem) }));
      this.leader = docsWithName.find(mem => mem.isLeader) || { userId: this.team.createdBy, userPlanetCode: this.team.teamPlanetCode };
      this.members = docsWithName.filter(mem => mem.docType === 'membership').sort((a, b) => memberSort(a, b, this.leader));
      this.requests = docsWithName.filter(mem => mem.docType === 'request');
      this.disableAddingMembers = this.members.length >= this.team.limit;
      this.finances = docs.filter(doc => doc.docType === 'transaction');
      this.financesCount = this.finances.length;
      this.reports = docs.filter(doc => doc.docType === 'report').sort((a, b) => (b.startDate - a.startDate) || (a.endDate - b.endDate));
      this.reportsCount = this.reports.length;
      this.setStatus(this.team, this.leader, this.userService.get());
      this.setTasks(this.tasks);
      return this.teamsService.getTeamResources(docs.filter(doc => doc.docType === 'resourceLink'));
    }), map(resources => this.resources = resources));
  }

  setTasks(tasks = []) {
    this.members = this.members.map(member => ({
      ...member,
      tasks: this.tasksService.sortedTasks(tasks.filter(({ assignee }) => assignee && assignee.userId === member.userId), member.tasks)
    }));
    if (this.userStatus === 'member') {
      const tasksForCount = this.isUserLeader ? tasks : this.members.find(member => member.userId === this.user._id).tasks;
      this.taskCount = tasksForCount.filter(task => task.completed === false).length;
    }
  }

  resetData() {
    this.getMembers().subscribe();
  }

  toggleAdd(data) {
    this.isRoot = data._id === 'root';
  }

  setStatus(team, leader, user) {
    this.userStatus = 'unrelated';
    if (team === undefined) {
      return;
    }
    this.userStatus = this.isUserInMemberDocs(this.requests, user) ? 'requesting' : this.userStatus;
    this.userStatus = this.isUserInMemberDocs(this.members, user) ? 'member' : this.userStatus;
    this.isUserLeader = user._id === leader.userId && user.planetCode === leader.userPlanetCode;
    if (this.initTab === undefined && this.userStatus === 'member' && this.route.snapshot.params.activeTab) {
      this.initTab = this.route.snapshot.params.activeTab;
    }
  }

  isUserInMemberDocs(memberDocs, user) {
    return memberDocs.some((memberDoc: any) => memberDoc.userId === user._id && memberDoc.userPlanetCode === user.planetCode);
  }

  toggleMembership(team, leaveTeam) {
    return () => this.teamsService.toggleTeamMembership(
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
      leave: { request: this.toggleMembership(item, true), successMsg: $localize`left`, errorMsg: $localize`leaving` },
      archive: { request: () => this.teamsService.archiveTeam(item)().pipe(switchMap(() => this.teamsService.deleteCommunityLink(item))),
        successMsg: $localize`deleted`, errorMsg: $localize`deleting` },
      resource: {
        request: this.removeResource(item), name: item.resource && item.resource.title, successMsg: $localize`removed`, errorMsg: $localize`removing`
      },
      course: { request: this.removeCourse(item), name: item.courseTitle, successMsg: $localize`removed`, errorMsg: $localize`removing` },
      remove: {
        request: this.changeMembershipRequest('removed', item), name: (item.userDoc || {}).fullName || item.name,
        successMsg: $localize`removed`, errorMsg: $localize`removing`
      },
      leader: { request: this.makeLeader(item), successMsg: $localize`given leadership to`, errorMsg: $localize`giving leadership to` }
    }[change];
  }

  openDialogPrompt(
    { tasks, ...item },
    change: 'leave' | 'archive' | 'resource' | 'remove' | 'course' | 'leader' | 'title',
    dialogParams: { changeType, type }
  ) {
    const config = this.dialogPromptConfig(item, change);
    const displayName = config.name || (item.userDoc ? item.userDoc.fullName : item.name);
    this.dialogPrompt = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: config.request(),
          onNext: (res) => {
            this.dialogPrompt.close();
            this.planetMessageService.showMessage($localize`You have ${config.successMsg} ${displayName}`);
            this.team = change === 'course' ? res : this.team;
            if (change === 'archive') {
              this.goBack();
            }
          },
          onError: () => this.planetMessageService.showAlert($localize`There was a problem ${config.errorMsg} ${displayName}`)
        },
        displayName,
        ...dialogParams
      }
    });
  }

  updateRole(member) {
    return ({ teamRole }) => {
      this.teamsService.updateMembershipDoc(this.team, false, { ...member, role: teamRole }).pipe(
        finalize(() => this.dialogsLoadingService.stop()),
        switchMap(() => this.getMembers())
      ).subscribe(() => {
        this.dialogsFormService.closeDialogsForm();
        this.planetMessageService.showMessage($localize`Role has been updated.`);
      });
    };
  }

  memberActionClick({ member, change }: { member, change: 'remove' | 'leader' | 'title' }) {
    if (change === 'title') {
      this.dialogsFormService.openDialogsForm(
        member.role ? $localize`Change Role` : $localize`Add Role`,
        [ { name: 'teamRole', placeholder: $localize`Role`, type: 'textbox' } ],
        { teamRole: member.role || '' },
        { autoFocus: true, onSubmit: this.updateRole(member).bind(this) }
      );
    } else {
      this.openDialogPrompt(member, change, { changeType: change, type: 'user' });
    }
  }

  changeMembershipRequest(type, memberDoc?) {
    const changeObject = this.changeObject(type, memberDoc);
    return () => {
      return changeObject.obs.pipe(
        switchMap(() => type === 'added' ? this.teamsService.removeFromRequests(this.team, memberDoc) : of({})),
        switchMap(() => type === 'removed' ? this.tasksService.removeAssigneeFromTasks(memberDoc.userId, { teams: this.teamId }) : of({})),
        switchMap(() => this.getMembers()),
        switchMap(() => this.sendNotifications(type, { members: type === 'request' ? this.members : [ memberDoc ] })),
        map(() => changeObject.message),
        finalize(() => this.dialogsLoadingService.stop())
      );
    };
  }

  changeMembership(type, memberDoc?) {
    this.dialogsLoadingService.start();
    this.changeMembershipRequest(type, memberDoc)().subscribe((message) => {
      this.setStatus(this.team, this.leader, this.userService.get());
      this.planetMessageService.showMessage(message);
    });
  }

  private changeObject(type, memberDoc?) {
    const memberName = memberDoc && memberDoc.userDoc && (memberDoc.userDoc.fullName || memberDoc.name);
    switch (type) {
      case 'request':
        return ({
          obs: this.teamsService.requestToJoinTeam(this.team, this.user),
          message: $localize`Request to join team sent`
        });
      case 'removed':
        return ({
          obs: this.teamsService.toggleTeamMembership(this.team, true, memberDoc),
          message: $localize`Removed: {memberName}`
        });
      case 'added':
        return ({
          obs: this.teamsService.toggleTeamMembership(this.team, false, { ...memberDoc, docType: 'membership' }),
          message: $localize`Accepted: ${memberName}`
        });
      case 'rejected':
        return ({
          obs: this.teamsService.removeFromRequests(this.team, memberDoc),
          message: $localize`Rejected: ${memberName}`
        });
    }
  }

  updateTeam() {
    this.teamsService.addTeamDialog(this.user._id, this.mode, this.team).subscribe((updatedTeam) => {
      this.team = updatedTeam;
      this.planetMessageService.showMessage((this.team.name || $localize`${this.configuration.name} Services Directory`) + $localize` updated successfully`);
    });
  }

  openInviteMemberDialog() {
    this.dialogRef = this.dialog.open(DialogsAddTableComponent, {
      width: '80vw',
      data: {
        okClick: (selected: any[]) => this.addMembers(selected),
        excludeIds: this.members.map(user => user.userId),
        hideChildren: true,
        mode: 'users'
      }
    });
  }

  addMembers(selected: any[]) {
    this.dialogsLoadingService.start();
    const newMembershipDocs = selected.map(
      user => this.teamsService.membershipProps(this.team, { userId: user._id, userPlanetCode: user.planetCode }, 'membership')
    );
    const requestsToDelete = this.requests.filter(request => newMembershipDocs.some(member => member.userId === request.userId))
      .map(request => ({ ...request, _deleted: true }));
    this.couchService.bulkDocs(this.dbName, [ ...newMembershipDocs, ...requestsToDelete ]).pipe(
      switchMap(() => {
        return forkJoin([
          this.teamsService.sendNotifications('added', selected, {
            url: this.router.url, team: { ...this.team }
          }),
          this.sendNotifications('addMember', { newMembersLength: selected.length })
        ]);
      }),
      switchMap(() => this.getMembers()),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => {
      this.dialogRef.close();
      this.planetMessageService.showMessage($localize`Member${(selected.length > 1 ? 's' : '')} added successfully`);
    });
  }

  sendNotifications(type, { members, newMembersLength = 0 }: { members?, newMembersLength? } = {}) {
    return this.teamsService.sendNotifications(type, members || this.members, {
      newMembersLength, url: this.router.url, team: { ...this.team }
    });
  }

  openCourseDialog() {
    const initialCourses = this.team.courses || [];
    const dialogRef = this.dialog.open(DialogsAddTableComponent, {
      width: '80vw',
      data: {
        okClick: (courses: any[]) => {
          const newCourses = courses.map(course => course.doc);
          this.teamsService.updateTeam({
            ...this.team,
            courses: [ ...(this.team.courses || []), ...newCourses ].sort((a, b) => a.courseTitle.localeCompare(b.courseTitle))
          }).subscribe((updatedTeam) => {
            this.team = updatedTeam;
            dialogRef.close();
            this.dialogsLoadingService.stop();
          });
        },
        mode: 'courses',
        excludeIds: initialCourses.map(c => c._id)
      }
    });
  }

  openAddMessageDialog(message = '') {
    this.dialogsFormService.openDialogsForm(
      $localize`Add message`,
      [ { name: 'message', placeholder: $localize`Message`, type: 'markdown', required: true, imageGroup: { teams: this.teamId } } ],
      { message: [ message, CustomValidators.requiredMarkdown ] },
      { autoFocus: true, onSubmit: this.postMessage.bind(this) }
    );
  }

  postMessage(message) {
    this.newsService.postNews({
      viewIn: [ { '_id': this.teamId, section: 'teams', public: this.userStatus !== 'member', name: this.team.name, mode: this.mode } ],
      messageType: this.team.teamType,
      messagePlanetCode: this.team.teamPlanetCode,
      ...message
    }, $localize`Message has been posted successfully`).pipe(
      switchMap(() => this.sendNotifications('message')),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => { this.dialogsFormService.closeDialogsForm(); });
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
    return () => forkJoin(obs).pipe(switchMap(() => this.getMembers()));
  }

  makeLeader(member) {
    const { tasks, ...currentLeader } = this.members.find(mem => memberCompare(mem, this.leader));
    return () => this.teamsService.changeTeamLeadership(currentLeader, member).pipe(switchMap(() => this.getMembers()));
  }

  removeCourse(course) {
    if (!this.team.courses) {
      return of(true);
    }
    return () => this.teamsService.updateTeam({ ...this.team, courses: this.team.courses.filter(c => c._id !== course._id) });
  }

  goBack(showMissingMessage = false) {
    if (showMissingMessage) {
      this.planetMessageService.showAlert($localize`This team was not found`);
    }
    if (this.mode === 'services') {
      this.router.navigate([ '../' ], { relativeTo: this.route });
    } else {
      this.router.navigate([ '../../' ], { relativeTo: this.route });
    }
  }

  openCourseView(courseId) {
    this.dialog.open(CoursesViewDetailDialogComponent, {
      data: { courseId: courseId, returnState: { route: `${this.mode}s/view/${this.teamId}` } },
      minWidth: '600px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      autoFocus: false
    });
  }

  openResource(resourceId) {
    this.dialog.open(DialogsResourcesViewerComponent, {
      data: { resourceId, returnState: { route: `${this.mode}s/view/${this.teamId}` }
    }, autoFocus: false });
  }

  openMemberDialog(member) {
    this.dialog.open(UserProfileDialogComponent, {
      data: { member },
      maxWidth: '90vw',
      maxHeight: '90vh'
    });
  }

}
