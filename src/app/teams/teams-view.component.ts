import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, switchMap, finalize } from 'rxjs/operators';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { NewsService } from '../news/news.service';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit, OnDestroy {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = [];
  disableAddingMembers = false;
  displayedColumns = [ 'name' ];
  userShelf: any = [];
  userStatus = 'unrelated';
  onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  dialogRef: MatDialogRef<DialogsListComponent>;
  user = this.userService.get();
  news: any[] = [];
  leftTileContent: 'description' | 'news' = 'news';

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
    private newsService: NewsService
  ) {}

  ngOnInit() {
    this.couchService.get('teams/' + this.teamId)
      .subscribe(data => {
        this.team = data;
        this.getMembers();
        this.setStatus(this.team, this.userService.get(), this.userService.shelf);
        this.userShelf = this.userService.shelf;
      });
    this.newsService.requestNews({ viewableBy: 'teams', viewableId: this.teamId });
    this.newsService.newsUpdated$.pipe(takeUntil(this.onDestroy$)).subscribe(news => this.news = news);
    this.userService.shelfChange$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(shelf => {
        this.userShelf = shelf;
        this.setStatus(this.team, this.userService.get(), this.userService.shelf);
        this.getMembers();
      });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  getMembers() {
    // find teamId on User shelf
    this.teamsService.getTeamMembers(this.teamId).subscribe((data) => {
      this.members = data.docs.map((mem) => {
        return { ...mem, name: mem._id.split(':')[1] };
      });
      this.disableAddingMembers = this.members.length >= this.team.limit;
    });
  }

  setStatus(team, user, shelf) {
    this.userStatus = 'unrelated';
    if (team === undefined) {
      return;
    }
    this.userStatus = team.requests.findIndex(id => id === user._id) > -1 ? 'requesting' : this.userStatus;
    this.userStatus = shelf.myTeamIds.findIndex(id => id === team._id) > -1 ? 'member' : this.userStatus;
    this.leftTileContent = this.userStatus !== 'member' ? 'description' : 'news';
  }

  toggleMembership(team, leaveTeam) {
    this.teamsService.toggleTeamMembership(team, leaveTeam, this.userShelf).subscribe((newTeam) => {
      this.team = newTeam;
      const msg = leaveTeam ? 'left' : 'joined';
      if (newTeam.status === 'archived') {
        this.router.navigate([ '/teams' ]);
      }
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

  requestToJoin() {
    this.teamsService.requestToJoinTeam(this.team, this.userShelf._id).pipe(
      switchMap((newTeam) => {
        this.team = newTeam;
        return this.sendNotifications('request');
      })
    ).subscribe((newTeam) => {
      this.setStatus(this.team, this.userService.get(), this.userService.shelf);
      this.planetMessageService.showMessage('Request to join team sent');
    });
  }

  acceptRequest(userId) {
    this.couchService.get('shelf/' + userId).pipe(
      switchMap((res) => {
        return this.teamsService.toggleTeamMembership(this.team, false, res);
      }),
      switchMap(() => {
        return this.teamsService.removeFromRequests(this.team, userId);
      })
    ).subscribe((newTeam) => {
      this.team = newTeam;
      this.getMembers();
      this.setStatus(this.team, this.userService.get(), this.userService.shelf);
    });
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
    this.teamsService.addTeamDialog(this.userShelf, this.team).subscribe((updatedTeam) => {
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

  addMembers(selected: string[]) {
    const selectedIds = selected.map((s: any) => s._id);
    this.couchService.findAll('shelf', { selector: { '_id': { '$in': selectedIds } } }).pipe(
      switchMap((shelves) => {
        const newShelves = shelves.map((shelf: any) => ({
          ...shelf,
          'myTeamIds': [].concat(shelf.myTeamIds, [ this.teamId ])
        }));
        return this.couchService.post('shelf/_bulk_docs', { docs: newShelves });
      }),
      switchMap((notifyShelf) => {
        const newTeam = { ...this.team, requests: this.team.requests.filter(reqId => selectedIds.indexOf(reqId) === -1) };
        return forkJoin([
          this.teamsService.updateTeam(newTeam),
          this.teamsService.sendNotifications('added', selected, {
            url: this.router.url, team: { ...newTeam }
          }),
          this.sendNotifications('addMember', selected.length)
        ]);
      })
    ).subscribe(([ updatedTeam, notificationRes1, notificationRes2 ]) => {
      this.team = updatedTeam;
      this.getMembers();
      this.dialogRef.close();
      this.planetMessageService.showMessage('Member' + (selected.length > 1 ? 's' : '') + ' added successfully');
    });
  }

  sendNotifications(type, newMembersLength = 0) {
    return this.teamsService.sendNotifications(type, this.members, {
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
      ...message
    }, 'Message has been posted successfully')
    .pipe(finalize(() => this.dialogsLoadingService.stop())).subscribe(() => { this.dialogsFormService.closeDialogsForm(); });
  }

  changeLeftTile() {
    this.leftTileContent = this.leftTileContent === 'news' ? 'description' : 'news';
  }

}
