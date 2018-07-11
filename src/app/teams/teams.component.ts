import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog, MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { filterSpecificFields } from '../shared/table-helpers';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
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
    this.teams.filterPredicate = filterSpecificFields([ 'name' ]);
    this.teams.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  getTeams() {
    this.couchService.allDocs(this.dbName).subscribe((data: any) => {
      this.teams.data = data;
      this.userShelf = this.userService.shelf;
      this.teams.data = this.teamList(this.teams.data, this.userService.shelf.myTeamIds);
    }, (error) => console.log(error));
  }

  ngAfterViewInit() {
    this.teams.sort = this.sort;
    this.teams.paginator = this.paginator;
  }

  teamList(teamRes, userTeamRes) {
    return teamRes.map((res: any) => {
      const team = res.doc || res;
      team.isMember = userTeamRes.indexOf(team._id) > -1;
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
