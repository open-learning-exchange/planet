import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent, MatDialog } from '@angular/material';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { PlanetMessageService } from '../../shared/planet-message.service';

@Component({
  templateUrl: './add-team.component.html',
  styleUrls: [ './add-team.component.scss' ]
})
export class AddTeamComponent implements OnInit, AfterViewInit {
  users: any = new MatTableDataSource();
  displayedColumns = [ '_id', 'name' ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  constructor(
    private userService: UserService,
    private couchService: CouchService

  ) { }

  ngOnInit() {
    this.getAlluser();
  }

  getAlluser() {
    this.couchService.allDocs('_users').subscribe(user => {
      const filterusers = user.filter((filteruser: any) => {
        return filteruser._id !== this.userService.get()._id;
      });
      this.users.data = filterusers;
    });
  }

  ngAfterViewInit() {
    this.users.paginator = this.paginator;
  }

}
