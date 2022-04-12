import { Component, OnInit, ViewChild, AfterViewInit, Input, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, map, finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import {
  filterSpecificFieldsByWord, composeFilterFunctions, filterSpecificFields, deepSortingDataAccessor
} from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { toProperCase } from '../shared/utils';
import { attachNamesToPlanets, codeToPlanetName } from '../manager-dashboard/reports/reports.utils';

@Component({
  templateUrl: './teams.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-doc-teamType {
      max-width: 150px;
      padding-right: 0.5rem;
    }
    .mat-column-visitLog-visitCount {
      max-width: 80px;
      padding-right: 0.5rem;
    }
    .mat-column-visitLog-lastVisit {
      max-width: 180px;
      padding-right: 0.5rem;
    }
    mat-row {
      cursor: pointer;
    }
  ` ],
  selector: 'planet-teams'
})
export class TeamsComponent implements OnInit, AfterViewInit {

  teams = new MatTableDataSource<any>();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userMembership: any[] = [];
  teamActivities: any[] = [];
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
  private _mode: 'team' | 'enterprise' = this.route.snapshot.data.mode || 'team';
  @Input()
  get mode(): 'team' | 'enterprise' {
    return this._mode;
  }
  set mode(newMode: 'team' | 'enterprise') {
    if (newMode !== this._mode) {
      this._mode = newMode;
      this.getTeams();
    }
  }
  @Input() isDialog = false;
  @Input() excludeIds = [];
  @Output() rowClick = new EventEmitter<{ mode: 'team' | 'enterprise', teamId: string, teamType: 'local' | 'sync' }>();
  displayedColumns = [ 'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType' ];
  childPlanets = [];
  filter: string;

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
  ) {}

  ngOnInit() {
    this.getTeams();
    this.teams.filterPredicate = composeFilterFunctions([
      filterSpecificFieldsByWord([ 'doc.name' ]),
      (data, filter) => filterSpecificFields([ 'userStatus' ])(data, this.myTeamsFilter === 'on' ? 'member' : '')
    ]);
    this.teams.sortingDataAccessor = (item: any, property) => deepSortingDataAccessor(item, property);
    this.couchService.checkAuthorization('teams').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.displayedColumns = this.isDialog ?
      [ 'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType' ] :
      [ 'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType', 'action' ];
  }

  getTeams() {
    const thirtyDaysAgo = time => {
      const date = new Date(time);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 30).getTime();
    };
    this.dialogsLoadingService.start();
    this.couchService.currentTime().pipe(switchMap(time =>
      forkJoin([
        this.couchService.findAll(this.dbName, { 'selector': { 'status': 'active' } }),
        this.getMembershipStatus(),
        this.couchService.findAll('team_activities', { 'selector': { 'type': 'teamVisit', 'time': { '$gte': thirtyDaysAgo(time) } } }),
        this.couchService.findAll('communityregistrationrequests')
      ])
    )).subscribe(([ teams, requests, activities, planets ]: any[]) => {
      this.childPlanets = attachNamesToPlanets(planets);
      this.teamActivities = activities;
      this.teams.filter = this.myTeamsFilter ? ' ' : '';
      this.teams.data = this.teamList(teams.filter(team => {
        return (team.type === this.mode || (team.type === undefined && this.mode === 'team')) && this.excludeIds.indexOf(team._id) === -1;
      }));
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
      this.couchService.findAll(this.dbName, { 'selector': { 'userId': this.user._id, 'userPlanetCode': this.user.planetCode } }),
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
    const noVisit = { visitCount: 0, lastVisit: undefined };
    return teamRes.map((res: any) => {
      const doc = res.doc || res;
      const membershipDoc = this.userMembership.find(req => req.teamId === doc._id) || {};
      const visitLog = this.teamActivities.filter(activity => activity.teamId === doc._id).reduce(({ visitCount, lastVisit }, activity) =>
        ({ visitCount: visitCount + 1, lastVisit: lastVisit && activity.time < lastVisit ? lastVisit : activity.time }), noVisit)
        || noVisit;
      const teamPlanetName = codeToPlanetName(doc.teamPlanetCode, this.stateService.configuration, this.childPlanets );
      const team = { doc, membershipDoc, visitLog, teamPlanetName };
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

  teamClick(teamId, teamType) {
    if (this.isDialog) {
      this.rowClick.emit({ mode: this.mode, teamId, teamType });
      return;
    }
    this.router.navigate([ 'view', teamId ], { relativeTo: this.route });
  }

  addTeam(team: any = {}) {
    const teamType = this.mode === 'enterprise' ? 'sync' : team.teamType;
    this.teamsService.addTeamDialog(this.user._id, this.mode, { ...team, teamType }).subscribe(() => {
      this.getTeams();
      const action = $localize`${team._id ? 'updated' : 'created'}`;
      const msg = $localize`${toProperCase(this.mode)} ${action} successfully`;
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
            this.planetMessageService.showMessage($localize`You have ${msg} ${team.name}`);
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
      request: this.teamsService.archiveTeam(team)().pipe(switchMap(() => this.teamsService.deleteCommunityLink(team))),
      onNext: () => {
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted a team.`);
        this.removeTeamFromTable(team);
      },
      onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this team.`)
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
      switchMap(() => this.getMembershipStatus()),
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(() => {
      this.teams.data = this.teamList(this.teams.data);
      this.planetMessageService.showMessage($localize`Request to join team sent`);
    });
  }

  resetSearch() {
    this.teams.filter = this.myTeamsFilter ? ' ' : '';
    this.filter = '';
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue || (this.myTeamsFilter ? ' ' : '');
  }

}
