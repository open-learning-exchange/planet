import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { Router } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil, switchMap, map } from 'rxjs/operators';
import { Subject, forkJoin } from 'rxjs';
import { filterSpecificFields, sortNumberOrString } from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';

@Component({
  templateUrl: './teams.component.html'
})
export class TeamsComponent implements OnInit, AfterViewInit {

  private onDestroy$ = new Subject<void>();
  teams = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userMembership: any[] = [];
  displayedColumns = [ 'name', 'createdDate', 'action' ];
  dbName = 'teams';
  emptyData = false;
  user = this.userService.get();
  isAuthorized = false;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.getTeams();
    this.teams.filterPredicate = filterSpecificFields([ 'doc.name' ]);
    this.teams.sortingDataAccessor = (item: any, property) => sortNumberOrString(item.doc, property);
    this.couchService.checkAuthorization('teams').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
  }

  getTeams() {
    forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': { 'status': 'active' } }),
      this.getMembershipStatus()
    ]).subscribe(([ teams, requests ]) => {
      this.teams.data = this.teamList(teams);
      this.emptyData = !this.teams.data.length;
      this.dialogsLoadingService.stop();
    }, (error) => console.log(error));
  }

  getMembershipStatus() {
    return this.couchService.findAll(this.dbName, { 'selector': { 'userId': this.user._id } }).pipe(
      map(membership => this.userMembership = membership)
    );
  }

  ngAfterViewInit() {
    this.teams.sort = this.sort;
    this.teams.paginator = this.paginator;
  }

  teamList(teamRes) {
    return teamRes.map((res: any) => {
      const team = { doc: res.doc || res };
      const membershipDoc = this.userMembership.find(req => req.teamId === team.doc._id) || {};
      switch (membershipDoc.docType) {
        case 'membership':
          return { ...team, userStatus: 'member' };
        case 'request':
          return { ...team, userStatus: 'requesting' };
        default:
          return { ...team, userStatus: 'unrelated' };
      }
    });
  }

  addTeam(team?) {
    this.teamsService.addTeamDialog(this.user._id, team).subscribe(() => {
      this.getTeams();
      const msg = team ? 'Team updated successfully' : 'Team created successfully';
      this.planetMessageService.showMessage(msg);
    });
  }

  toggleMembership(team, leaveTeam) {
    this.teamsService.toggleTeamMembership(
      team, leaveTeam, { userId: this.user._id, userPlanetCode: this.user.planetCode }
    ).pipe(
      switchMap(() => this.getMembershipStatus())
    ).subscribe((newTeam: any) => {
      this.teams.data = this.teamList(this.teams.data);
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
        this.getMembershipStatus().subscribe(() => this.teams.data = this.teamList(this.teams.data));
        return this.teamsService.getTeamMembers(newTeam);
      }),
      switchMap((docs) => {
        return this.teamsService.sendNotifications('request', docs, { team, url: this.router.url + '/view/' + team._id });
      })
    ).subscribe(() => this.planetMessageService.showMessage('Request to join team sent'));
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue;
  }

}
