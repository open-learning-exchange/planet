import { Component, OnInit, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { MatTableDataSource, MatPaginator, PageEvent, MatDialog, MatDialogRef } from '@angular/material';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { SelectionModel } from '@angular/cdk/collections';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { filterSpecificFields } from '../../shared/table-helpers';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { DialogsFormComponent } from '../../shared/dialogs/dialogs-form.component';
import { Router } from '@angular/router';

@Component({
  templateUrl: './add-team.component.html',
  styleUrls: [ './add-team.component.scss' ]
})
export class AddTeamComponent implements OnInit, AfterViewInit {
  mockTeams = Array(3).fill(0).map((val, ind, arr) => {
    return { id: ind.toString(), teamName: 'Team ' + ind, userList: [] };
  });
  teams: any = new MatTableDataSource();
  displayedColumns = [ 'id', 'teamName', 'action', 'userList' ];
  selection = new SelectionModel(false, []);
  dialogRef: MatDialogRef<DialogsListComponent>;
  userInfo: any = {
    id: '',
    name: '',
  };
  dialogRefCreateNewTeam: MatDialogRef<DialogsFormComponent>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userForm: FormGroup;
  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private dialogsFormService: DialogsFormService,
    private router: Router
  ) { }

  ngOnInit() {
    this.teams.data = this.mockTeams;
    this.userForm = this.fb.group(this.userInfo);
  }

  ngAfterViewInit() {
    this.teams.paginator = this.paginator;
  }

  attachUserList(element, dbName) {
    this.dialogsListService.getListAndColumns(dbName).subscribe(res => {
      const data = { okClick: this.dialogOkClick(dbName, element.id).bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        ...res };
      data.columns = [ 'name' ];
      data.teamName = element.teamName;
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data: data,
        height: '500px',
        width: '600px',
        autoFocus: false
      });
    });
  }

  dialogOkClick(db: string, teamId: string) {
    return (user: any) => {
      this.mockTeams.forEach(mockItem => {
        if (mockItem.id === teamId) {
          mockItem.userList.push(user);
        }
      });
      this.dialogRef.close();
    };
  }

  createNewTeamForm() {
    const title = 'New Team';
    const fields = [ {
      'label': 'Team Name',
      'type': 'textbox',
      'inputType': 'text',
      'name': 'teamName',
      'placeholder': 'Team Name',
      'required': true
    } ];
    const formGroup = {
      teamName: [ '', Validators.required ]
    };
    this.dialogsFormService.confirm(title, fields, formGroup)
    .subscribe((res: any) => {
      res.id = '6',
      res.userList = [];
      this.mockTeams.push(res);
      this.teams.paginator = this.paginator;
    });
  }

  routeToAddNewMemberOnTeam() {
    this.router.navigate([ 'manager/manageteam/createnewmember', this.selection.selected[0].id ]);
  }

}
