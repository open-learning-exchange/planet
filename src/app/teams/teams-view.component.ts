import { Component, OnInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { UserService } from '../shared/user.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { TeamsService } from './teams.service';
import { Subject } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../shared/table-helpers';

@Component({
  templateUrl: './teams-view.component.html',
  styleUrls: [ './teams-view.scss' ]
})
export class TeamsViewComponent implements OnInit, OnDestroy {

  team: any;
  teamId = this.route.snapshot.paramMap.get('teamId');
  members = [];
  displayedColumns = [ 'name' ];
  userShelf: any = [];
  userStatus = 'unrelated';
  onDestroy$ = new Subject<void>();
  currentUserName = this.userService.get().name;
  dialogRef: MatDialogRef<DialogsListComponent>;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private dialog: MatDialog,
    private dialogsListService: DialogsListService
  ) {}

  ngOnInit() {
    this.couchService.get('teams/' + this.teamId)
      .subscribe(data => {
        this.team = data;
        this.getMembers();
        this.setStatus(this.team, this.userService.get(), this.userService.shelf);
        this.userShelf = this.userService.shelf;
      });
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
    this.couchService.post('shelf/_find', findDocuments({
      'myTeamIds': { '$in': [ this.teamId ] }
    }, 0)).subscribe((data) => {
      this.members = data.docs.map((mem) => {
        return { name: mem._id.split(':')[1] };
      });
    });
  }

  setStatus(team, user, shelf) {
    this.userStatus = 'unrelated';
    this.userStatus = team.requests.findIndex(id => id === user._id) > -1 ? 'requesting' : this.userStatus;
    this.userStatus = shelf.myTeamIds.findIndex(id => id === team._id) > -1 ? 'member' : this.userStatus;
  }

  toggleMembership(teamId, leaveTeam) {
    this.teamsService.toggleTeamMembership(teamId, leaveTeam, this.userShelf).subscribe(() => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

  requestToJoin() {
    this.teamsService.requestToJoinTeam(this.team, this.userShelf._id).subscribe((newTeam) => {
      this.team = newTeam;
      this.setStatus(this.team, this.userService.get(), this.userService.shelf);
      this.planetMessageService.showMessage('Request to join team sent');
    });
  }

  acceptRequest(userId) {
    this.couchService.get('shelf/' + userId).pipe(
      switchMap((res) => {
        return this.teamsService.toggleTeamMembership(this.team._id, false, res);
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

  openInviteMemberDialog() {
    this.dialogsListService.getListAndColumns('_users').subscribe((res) => {
      res.tableData = res.tableData.filter(tableValue => this.members.indexOf(tableValue.name) === -1);
      const data = {
        okClick: this.addMembers.bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        allowMulti: true,
        ...res
      };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
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
      })
    ).subscribe(res => {
      this.getMembers();
      this.dialogRef.close();
      this.planetMessageService.showMessage('Member' + (selected.length > 1 ? 's' : '') + ' added successfully');
    });
  }

}
