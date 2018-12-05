import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatDialog, MatSort, MatPaginator, MatDialogRef } from '@angular/material';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingComponent } from '../shared/dialogs/dialogs-loading.component';

@Component({
  templateUrl: './teams.component.html'
})
export class TeamsComponent implements OnInit, AfterViewInit {

  private onDestroy$ = new Subject<void>();
  teams = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userShelf: any = [];
  displayedColumns = [ 'name', 'createdDate', 'action' ];
  dbName = 'teams';
  emptyData = false;
  user = this.userService.get();
  spinnerDialog: MatDialogRef<DialogsLoadingComponent>;

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private router: Router
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.userShelf = this.userService.shelf;
        this.teams.data = this.teamList(this.teams.data, shelf.myTeamIds);
      });
  }

  ngOnInit() {
    this.spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
      disableClose: true
    });
    this.getTeams();
    this.teams.filterPredicate = filterSpecificFields([ 'doc.name' ]);
    this.teams.sortingDataAccessor = (item: any, property) => sortNumberOrString(item.doc, property);
  }

  getTeams() {
    this.couchService.findAll(this.dbName, { 'selector': { 'status': 'active' } }).subscribe((data: any) => {
      this.userShelf = this.userService.shelf;
      this.teams.data = this.teamList(data, this.userService.shelf.myTeamIds);
      this.emptyData = !this.teams.data.length;
      this.closeSpinner();
    }, (error) => console.log(error));
  }

  ngAfterViewInit() {
    this.teams.sort = this.sort;
    this.teams.paginator = this.paginator;
  }

  teamList(teamRes, userTeamRes) {
    return teamRes.map((res: any) => {
      const team = { doc: res.doc || res, userStatus: 'unrelated' };
      team.userStatus = userTeamRes.indexOf(team.doc._id) > -1 ? 'member' : team.userStatus;
      team.userStatus = team.doc.requests.indexOf(this.userService.get()._id) > -1 ? 'requesting' : team.userStatus;
      return team;
    });
  }

  addTeam(team?) {
    this.teamsService.addTeamDialog(this.userShelf, team).subscribe(() => {
      this.getTeams();
      const msg = team ? 'Team updated successfully' : 'Team created successfully';
      this.planetMessageService.showMessage(msg);
    });
  }

  toggleMembership(team, leaveTeam) {
    this.teamsService.toggleTeamMembership(team, leaveTeam, this.userShelf).subscribe((newTeam) => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team.');
      if (newTeam.status === 'archived') {
        this.teams.data = this.teams.data.filter((t: any) => t.doc._id !== newTeam._id);
      }
    });
  }

  requestToJoin(team) {
    this.teamsService.requestToJoinTeam(team, this.userService.get()._id).pipe(
      switchMap((newTeam) => {
        this.teams.data = this.teamList(this.teams.data.map((t: any) => t.doc._id === newTeam._id ? newTeam : t), this.userShelf.myTeamIds);
        return this.teamsService.getTeamMembers(newTeam._id);
      }),
      switchMap((response) => {
        return this.teamsService.sendNotifications('request', response.docs, { team, url: this.router.url + '/view/' + team._id });
      })
    ).subscribe(() => this.planetMessageService.showMessage('Request to join team sent'));
  }

  // If multiple team is added then need to check
  dedupeShelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue;
  }

  closeSpinner() {
    for (const entry of this.dialog.openDialogs) {
      if (entry === this.spinnerDialog) {
        this.spinnerDialog.close();
      }
    }
  }

}
