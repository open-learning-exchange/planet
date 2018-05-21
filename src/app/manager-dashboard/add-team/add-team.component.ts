import { Component, OnInit, ViewChild, AfterViewInit, ElementRef, } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent, MatDialog, MatDialogRef } from '@angular/material';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { SelectionModel } from '@angular/cdk/collections';
import { DialogsListService } from '../../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../../shared/dialogs/dialogs-list.component';
import { filterSpecificFields } from '../../shared/table-helpers';
import {
  FormBuilder,
  FormControl,
  FormGroup,
} from '@angular/forms';

@Component({
  templateUrl: './add-team.component.html',
  styleUrls: [ './add-team.component.scss' ]
})
export class AddTeamComponent implements OnInit, AfterViewInit {
  mockTeams = Array(3).fill(0).map((val, ind, arr) => {
    return { id: ind.toString(), teamName: 'Team ' + ind, userList: [] };
  });
  teams: any = new MatTableDataSource();
  displayedColumns = [ '_id', 'teamName', 'action', 'userList' ];
  selection = new SelectionModel(true, []);
  dialogRef: MatDialogRef<DialogsListComponent>;
    userInfo: any = {
    id: '',
    name: '',
    };
  @ViewChild(MatPaginator) paginator: MatPaginator;
  userForm: FormGroup;
  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private dialogsListService: DialogsListService,
    private dialog: MatDialog,
    private fb: FormBuilder
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
      };
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
}

