import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog, MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { filterSpecificFields } from '../shared/table-helpers';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { debug } from '../debug-operator';

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
    private dialog: MatDialog,
    private userService: UserService,
    private couchService: CouchService,
    private dialogsFormService: DialogsFormService,
    private planetMessageService: PlanetMessageService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.userShelf = this.userService.shelf;
        this.teams.data = this.teamList(this.teams.data, shelf.myTeamIds);
      });
  }

  ngOnInit() {
    this.getTeam();
    this.teams.filterPredicate = filterSpecificFields([ 'name' ]);
    this.teams.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  getTeam() {
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
    const title = 'Create Team';
    const fields = [ {
        'type': 'textbox',
        'name': 'name',
        'placeholder': 'Name',
        'required': true
      }, {
        'type': 'textarea',
        'name': 'description',
        'placeholder': 'Detail',
        'required': false
    } ];
    const formGroup = {
      name: [ '', Validators.required ],
      description: ''
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .pipe(debug('Dialog confirm'))
      .subscribe((response) => {
        if (response !== undefined) {
          this.createTeam(response);
        }
      });
  }

  // If multiple team is added then need to check
  dedupeShelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  createTeam(post: any) {
    this.couchService.post(this.dbName + '/', post).pipe(
      switchMap(newTeam => {
        return this.updateTeam(newTeam.id, false);
      }))
    .subscribe((data: any) => {
      this.userShelf._rev = data.rev;
      this.userService.shelf = this.userShelf;
      this.getTeam();
      this.planetMessageService.showMessage('Team has been created');
    },
    (error) => {
      this.planetMessageService.showAlert('Error on creating team');
    });
  }

  joinTeam(teamId, becomeMember) {
    this.updateTeam(teamId, becomeMember).subscribe(data => {
      this.userShelf._rev = data.rev;
      this.userService.shelf = this.userShelf;
      this.teamList(this.teams.data, this.userShelf.myTeamIds);
      const msg = becomeMember ? 'left' : 'joined';
      this.planetMessageService.showMessage('You have ' + msg + ' team');
    });
  }

  updateTeam(teamId, becomeMember) {
    let myTeamIds = this.userService.shelf.myTeamIds;
    if (becomeMember) {
      myTeamIds.splice(myTeamIds.indexOf(teamId), 1);
    } else {
      myTeamIds = myTeamIds.concat([ teamId ]).reduce(this.dedupeShelfReduce, []);
    }
    this.userShelf.myTeamIds = myTeamIds;
    return this.couchService.put('shelf/' + this.userService.get()._id, { ...this.userShelf });
  }

  applyFilter(filterValue: string) {
    this.teams.filter = filterValue;
  }

}
