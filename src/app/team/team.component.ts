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
  templateUrl: './team.component.html'
})
export class TeamComponent implements OnInit, AfterViewInit {

  private onDestroy$ = new Subject<void>();
  team = new MatTableDataSource();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userShelf: any = [];
  displayedColumns = [ 'name', 'action' ];

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
        this.team.data = this.teamList(this.team.data, shelf.myTeamIds);
      });
  }

  ngOnInit() {
    this.getTeam();
    this.team.filterPredicate = filterSpecificFields([ 'name' ]);
    this.team.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  getTeam() {
    this.couchService.allDocs('team').subscribe((data: any) => {
      this.team.data = data;
      this.userShelf = this.userService.shelf;
      this.team.data = this.teamList(this.team.data, this.userService.shelf.myTeamIds);
    }, (error) => console.log(error));
  }

  ngAfterViewInit() {
    this.team.sort = this.sort;
    this.team.paginator = this.paginator;
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
    const type = 'team';
    const fields = [ {
        'label': 'Is Group Open',
        'type': 'radio',
        'name': 'openGroup',
        'options': [ 'Yes', 'No' ],
        'required': true
      }, {
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
      description: '',
      openGroup: [ 'Yes', Validators.required ],
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
    this.couchService.post('team/', post).pipe(
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
      this.teamList(this.team.data, this.userShelf.myTeamIds);
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
    this.team.filter = filterValue;
  }

}
