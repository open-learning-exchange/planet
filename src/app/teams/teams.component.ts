import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, map } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { filterSpecificFieldsByWord, sortNumberOrString, composeFilterFunctions, filterSpecificFields } from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';

@Component({
  templateUrl: './teams.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-teamType {
      max-width: 150px;
      padding-right: 0.5rem;
    }
    .mat-column-createdDate {
      max-width: 180px;
      padding-right: 0.5rem;
    }
    mat-row {
      cursor: pointer;
    }
  ` ]
})
export class TeamsComponent implements OnInit, AfterViewInit {

  teams = new MatTableDataSource<any>();
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  userMembership: any[] = [];
  dbName = 'teams';
  emptyData = false;
  user = this.userService.get();
  isAuthorized = false;
  planetType = this.stateService.configuration.planetType;
  planetCode = this.stateService.configuration.code;
  leaveDialog: any;
  message = '';
  deleteDialog: any;
  readonly myTeamsFilter = this.route.snapshot.data.myTeams ? 'on' : 'off';
  mode: 'team' | 'enterprise' = this.route.snapshot.data.mode || 'team';
  displayedColumns = this.planetType === 'community' && this.mode === 'enterprise' ?
    [ 'name', 'createdDate', 'action' ] :
    [ 'name', 'createdDate', 'teamType', 'action' ];

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog,
    private stateService: StateService,
    private route: ActivatedRoute
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.getTeams();
    this.teams.filterPredicate = composeFilterFunctions([
      filterSpecificFieldsByWord([ 'doc.name' ]),
      (data, filter) => filterSpecificFields([ 'userStatus' ])(data, this.myTeamsFilter === 'on' ? 'member' : '')
    ]);
    this.teams.sortingDataAccessor = (item: any, property) => sortNumberOrString(item.doc, property);
    this.couchService.checkAuthorization('teams').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
  }

  getTeams() {
    forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': { 'status': 'active' } }),
      this.getMembershipStatus()
    ]).subscribe(([ teams, requests ]: any[]) => {
      this.teams.filter = this.myTeamsFilter ? ' ' : '';
      this.teams.data = this.teamList(teams.filter(team => team.type === this.mode || (team.type === undefined && this.mode === 'team')));
      if (this.teams.data.some(
        ({ doc, userStatus }) => doc.teamType === 'sync' && (userStatus === 'member' || userStatus === 'requesting')
      )) {
        this.userService.addImageForReplication(true).subscribe(() => {});
      }
      this.emptyData = !this.teams.data.length;
      this.dialogsLoadingService.stop();
    }, (error) => console.log(error));
  }

  getMembershipStatus() {
    return forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': { 'userId': this.user._id } }),
      this.couchService.get('shelf/' + this.user._id)
    ]).pipe(
      map(([ membershipDocs, shelf ]) => this.userMembership = [
        ...membershipDocs,
        ...(shelf.myTeamIds || []).map(id => ({ teamId: id, fromShelf: true, docType: 'membership', userId: this.user._id }))
      ])
    );
  }

  ngAfterViewInit() {
    this.teams.sort = this.sort;
    this.teams.paginator = this.paginator;
  }

  teamList(teamRes) {
    return teamRes.map((res: any) => {
      const doc = res.doc || res;
      const membershipDoc = this.userMembership.find(req => req.teamId === doc._id) || {};
      const team = { doc, membershipDoc };
      switch (membershipDoc.docType) {
        case 'membership':
          return { ...team, userStatus: 'member', isLeader: membershipDoc.isLeader };
        case 'request':
          return { ...team, userStatus: 'requesting' };
        default:
          return { ...team, userStatus: 'unrelated' };
      }
    });
  }

  addTeam(team: any = {}) {
    const teamType = this.mode === 'enterprise' ? 'sync' : team.teamType;
    this.teamsService.addTeamDialog(this.user._id, this.mode, { ...team, teamType }).subscribe(() => {
      this.getTeams();
      const msg = team ? 'Team updated successfully' : 'Team created successfully';
      this.planetMessageService.showMessage(msg);
    });
  }

  leaveTeam(team, membershipDoc) {
    return this.teamsService.toggleTeamMembership(
      team, true, membershipDoc
    ).pipe(
      switchMap((newTeam: any) => {
        if (newTeam.status === 'archived') {
          this.removeTeamFromTable(team);
        }
        return this.getMembershipStatus();
    }));
  }

  openLeaveDialog(team, membershipDoc) {
    this.leaveDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.leaveTeam(team, membershipDoc),
          onNext: () => {
            this.leaveDialog.close();
            this.teams.data = this.teamList(this.teams.data);
            const msg = 'left';
            this.planetMessageService.showMessage('You have ' + msg + ' ' + team.name);
          },
        },
        changeType: 'leave',
        type: 'team',
        displayName: team.name
      }
    });
  }

  archiveTeam(team) {
    return {
      request: this.teamsService.archiveTeam(team),
      onNext: () => {
        this.deleteDialog.close();
        this.planetMessageService.showMessage('You have deleted a team.');
        this.removeTeamFromTable(team);
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this team.')
    };
  }

  archiveClick(team) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.archiveTeam(team),
        changeType: 'delete',
        type: 'team',
        displayName: team.name
      }
    });
  }

  removeTeamFromTable(newTeam: any) {
    this.teams.data = this.teams.data.filter((t: any) => t.doc._id !== newTeam._id);
  }

  requestToJoin(team) {
    this.dialogsLoadingService.start();
    this.teamsService.requestToJoinTeam(team, this.userService.get()).pipe(
      switchMap(() => this.teamsService.getTeamMembers(team)),
      switchMap((docs) => this.teamsService.sendNotifications('request', docs, { team, url: this.router.url + '/view/' + team._id })),
      switchMap(() => this.getMembershipStatus())
    ).subscribe(() => {
      this.teams.data = this.teamList(this.teams.data);
      this.planetMessageService.showMessage('Request to join team sent');
      this.dialogsLoadingService.stop();
    });
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue || (this.myTeamsFilter ? ' ' : '');
  }

}
