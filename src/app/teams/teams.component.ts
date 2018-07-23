import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { filterSpecificFields } from '../shared/table-helpers';
import { TeamsService } from './teams.service';

@Component({
  templateUrl: './teams.component.html'
})
export class TeamsComponent implements OnInit, AfterViewInit {

  private onDestroy$ = new Subject<void>();
  teams = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userShelf: any = [];
  displayedColumns = [ 'name', 'action' ];
  dbName = 'teams';

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private teamsService: TeamsService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.userShelf = this.userService.shelf;
        this.teams.data = this.teamList(this.teams.data, shelf.myTeamIds);
      });
  }

  ngOnInit() {
    this.getTeams();
    this.teams.filterPredicate = filterSpecificFields([ 'doc.name' ]);
    this.teams.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  getTeams() {
    this.couchService.allDocs(this.dbName).subscribe((data: any) => {
      this.userShelf = this.userService.shelf;
      this.teams.data = this.teamList(data, this.userService.shelf.myTeamIds);
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

  addTeam() {
    this.teamsService.addTeamDialog(this.userShelf).subscribe(() => {
      this.getTeams();
      this.planetMessageService.showMessage('Team created');
    });
  }

  toggleMembership(teamId, leaveTeam) {
    this.teamsService.toggleTeamMembership(teamId, leaveTeam, this.userShelf).subscribe(() => {
      const msg = leaveTeam ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team.');
    });
  }

  requestToJoin(team) {
    this.teamsService.requestToJoinTeam(team, this.userService.get()._id).subscribe((newTeam) => {
      this.teamList(this.teams.data.map((t: any) => t._id === newTeam._id ? newTeam : t), this.userShelf.myTeamIds);
      this.planetMessageService.showMessage('Request to join team sent');
    });
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

}
