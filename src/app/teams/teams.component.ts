import { Component, OnInit, ViewChild, AfterViewInit, Input, EventEmitter, Output, HostListener } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Router, ActivatedRoute } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, map, finalize, catchError } from 'rxjs/operators';
import { forkJoin, throwError } from 'rxjs';
import {
  filterSpecificFieldsByWord, composeFilterFunctions, filterSpecificFields, deepSortingDataAccessor
} from '../shared/table-helpers';
import { TeamsService } from './teams.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { StateService } from '../shared/state.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { attachNamesToPlanets, codeToPlanetName } from '../manager-dashboard/reports/reports.utils';

@Component({
  templateUrl: './teams.component.html',
  styleUrls: [ './teams.scss' ],
  selector: 'planet-teams'
})
export class TeamsComponent implements OnInit, AfterViewInit {

  teams = new MatTableDataSource<any>();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userMembership: any[] = [];
  teamActivities: any[] = [];
  dbName = 'teams';
  user = this.userService.get();
  isAuthorized = false;
  planetType = this.stateService.configuration.planetType;
  planetCode = this.stateService.configuration.code;
  leaveDialog: any;
  message = '';
  deleteDialog: any;
  isLoading = true;
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
  deviceType: DeviceType;
  isMobile: boolean;
  userNotInShelf = false;
  showFiltersRow = false;
  selection = new SelectionModel(true, []);
  selectedIds: string[] = [];
  get tableData() {
    return this.teams;
  }
  showUserTeamsFilter = false;

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService,
    private router: Router,
    private dialogsLoadingService: DialogsLoadingService,
    private dialog: MatDialog,
    private stateService: StateService,
    private route: ActivatedRoute,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE || this.deviceType === DeviceType.SMALL_MOBILE;
  }

  ngOnInit() {
    this.getTeams();
    this.teams.filterPredicate = composeFilterFunctions([
      filterSpecificFieldsByWord([ 'doc.name' ]),
      (data, filter) => filterSpecificFields([ 'userStatus' ])(data, this.myTeamsFilter === 'on' ? 'member' : '')
    ]);
    this.teams.sortingDataAccessor = (item, property) => {
      if (property === 'membership') {
        switch (item.userStatus) {
          case 'member': return 2;
          case 'requesting': return 1;
          default: return 0;
        }
      }
      return deepSortingDataAccessor(item, property);
    };
    this.couchService.checkAuthorization('teams').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.displayedColumns = this.isDialog ?
      [ 'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType' ] :
      [ 'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType', 'action' ];
  }

  @HostListener('window:resize') onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE || this.deviceType === DeviceType.SMALL_MOBILE;
  }

  getTeams() {
    this.isLoading = true;
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
        const teamMode = this.myTeamsFilter === 'on' ? (team.type === 'team' || team.type === 'enterprise') : team.type === this.mode;
        return (teamMode || (team.type === undefined && this.mode === 'team')) && this.excludeIds.indexOf(team._id) === -1;
      }));
      if (this.teams.data.some(
        ({ doc, userStatus }) => doc.teamType === 'sync' && (userStatus === 'member' || userStatus === 'requesting')
      )) {
        this.userService.addImageForReplication(true).subscribe(() => {});
      }
      this.dialogsLoadingService.stop();
      this.isLoading = false;
      this.showUserTeamsFilter = this.myTeamsFilter === 'off' &&
       this.teams.data.some(e => e.userStatus === 'member' || e.userStatus === 'requesting');
    }, (error) => {
      if (this.userNotInShelf) {
        this.displayedColumns = [ 'doc.name', 'visitLog.lastVisit', 'visitLog.visitCount', 'doc.teamType' ];
        this.couchService.findAll(this.dbName, { 'selector': { 'status': 'active' } }).subscribe((teams) => {
          this.teams.data = this.teamList(teams.filter((team: any) => {
            return (team.type === this.mode || (team.type === undefined && this.mode === 'team'))
            && this.excludeIds.indexOf(team._id) === -1;
          }));
        });
      }
      this.dialogsLoadingService.stop();
      console.log(error);
      this.isLoading = false;
    });
  }

  getMembershipStatus() {
    return forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': { 'userId': this.user._id, 'userPlanetCode': this.user.planetCode } }),
      this.couchService.get('shelf/' + this.user._id)
    ]).pipe(
      map(([ membershipDocs, shelf ]) => this.userMembership = [
        ...membershipDocs,
        ...(shelf.myTeamIds || []).map(id => ({ teamId: id, fromShelf: true, docType: 'membership', userId: this.user._id }))
      ]),
      catchError(error => {
        if (error.status === 404) {
          this.userNotInShelf = true;
        }
        return throwError(error);
      })
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
      // Toggle selection
      const index = this.selectedIds.indexOf(teamId);
      index === -1 ? this.selectedIds.push(teamId) : this.selectedIds.splice(index, 1);

      this.rowClick.emit({ mode: this.mode, teamId, teamType });
      return;
    }
    this.router.navigate([ 'view', teamId ], { relativeTo: this.route });
  }

  addTeam(team: any = {}) {
    const teamType = this.mode === 'enterprise' ? 'sync' : team.teamType;
    this.teamsService.addTeamDialog(this.user._id, this.mode, { ...team, teamType }).subscribe(() => {
      this.getTeams();
      const msg = team._id
        ? (this.mode === 'enterprise'
            ? $localize`:@@enterprise-updated-success:Enterprise updated successfully`
            : $localize`:@@team-updated-success:Team updated successfully`)
        : (this.mode === 'enterprise'
            ? $localize`:@@enterprise-created-success:Enterprise created successfully`
            : $localize`:@@team-created-success:Team created successfully`);
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
            const msg = this.mode === 'enterprise'
              ? $localize`:@@enterprise-left:You have left enterprise` + ' ' + team.name
              : $localize`:@@team-left:You have left team` + ' ' + team.name;
            this.planetMessageService.showMessage(msg);
          },
        },
        changeType: 'leave',
        type: this.mode === 'enterprise' ? 'enterprise' : 'team',
        displayName: team.name
      }
    });
  }

  archiveTeam(team) {
    return {
      request: this.teamsService.archiveTeam(team)().pipe(switchMap(() => this.teamsService.deleteCommunityLink(team))),
      onNext: () => {
        this.deleteDialog.close();
        const msg = this.mode === 'enterprise'
          ? $localize`:@@enterprise-deleted:You have deleted enterprise` + ' ' + team.name + '.'
          : $localize`:@@team-deleted:You have deleted team` + ' ' + team.name + '.';
        this.planetMessageService.showMessage(msg);
        this.removeTeamFromTable(team);
      },
      onError: () => {
        const msg = this.mode === 'enterprise'
          ? $localize`:@@enterprise-delete-error:There was a problem deleting this enterprise.`
          : $localize`:@@team-delete-error:There was a problem deleting this team.`;
        this.planetMessageService.showAlert(msg);
      }
    };
  }

  archiveClick(team) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.archiveTeam(team),
        changeType: 'delete',
        type: this.mode === 'enterprise' ? 'enterprise' : 'team',
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
      const msg = this.mode === 'enterprise'
        ? $localize`:@@enterprise-join-request:Sent request to join enterprise` + ' ' + team.name
        : $localize`:@@team-join-request:Sent request to join team` + ' ' + team.name;
      this.planetMessageService.showMessage(msg);
    });
  }

  resetSearch() {
    this.teams.filter = this.myTeamsFilter ? ' ' : '';
    this.filter = '';
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue || (this.myTeamsFilter ? ' ' : '');
  }

  sortbyUserTeams() {
    if (!this.teams.data.some(e => e.userStatus === 'member' || e.userStatus === 'requesting')) { return; }

    this.sort.active = 'membership';
    this.sort.direction = 'desc';
    this.sort.sortChange.emit({
      active: this.sort.active,
      direction: this.sort.direction
    });
  }

  getTeamTypeLabel(team: any): string {
    return team.doc.type === 'enterprise' ? $localize`enterprise` : $localize`team`;
  }

}
