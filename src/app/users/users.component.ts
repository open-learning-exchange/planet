import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { Subject } from 'rxjs/Subject';
import { NgModel } from '@angular/forms';

@Component({
  templateUrl: './users.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
  ` ]
})
export class UsersComponent implements OnInit, AfterViewInit {

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  allUsers = new MatTableDataSource();
  message = '';
  displayTable = true;
  displayedColumns = [ 'select', 'profile', 'name', 'roles', 'action' ];
  isUserAdmin = false;
  updatedRole = [];
  // List of all possible roles to add to users
  roleList: string[] = [ 'intern', 'learner', 'teacher' ];
  selectedRole = '';
  selection = new SelectionModel(true, []);
  private dbName = '_users';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  userShelf = this.userService.getUserShelf();
  private onDestroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.setMyTeams(this.allUsers.data, this.userService.getUserShelf().myTeamIds);
      });
    }

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (this.isUserAdmin) {
      this.initializeData();
    } else {
      // A non-admin user cannot receive all user docs
      this.planetMessageService.showAlert('Access restricted to admins');
    }
  }

  applyFilter(filterValue: string) {
    this.allUsers.filter = filterValue;
  }

  ngAfterViewInit() {
    this.allUsers.sort = this.sort;
    this.allUsers.paginator = this.paginator;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.allUsers.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.allUsers.data.forEach(row => this.selection.select(row));
  }

  getUsers() {
    return this.couchService.post(this.dbName + '/_find', { 'selector': { } });
  }

  initializeData() {
    this.selection.clear();
    this.getUsers().debug('Getting user list').subscribe(users => {
      users = users.docs.map((user: any) => {
        const userInfo = { doc: user, imageSrc: '', myTeamInfo: true };
        if (user._attachments) {
          userInfo.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
        }
        return userInfo;
      });
      this.setMyTeams(users, this.userService.getUserShelf().myTeamIds);
    }, (error) => {
      // A bit of a placeholder for error handling.  Request will return error if the logged in user is not an admin.
      console.log('Error initializing data!');
      console.log(error);
    });
  }

  setRoles(user, roles) {
    const tempUser = {
      ...user,
      roles,
      oldRoles: [ ...user.roles ] || [ 'learner' ],
      isUserAdmin: roles.indexOf('manager') > -1
    };
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).subscribe((response) => {
      console.log('Success!');
      this.initializeData();
    }, (error) => {
      console.log(error);
    });
  }

  setMyTeams(users, myTeamIds = []) {
    this.allUsers.data = users.map((user: any) => {
      user.myTeamInfo = myTeamIds.indexOf(user.doc._id) > -1;
      return user;
    }, []);
  }

  deleteRole(user: any, index: number) {
    // Make copy of user so UI doesn't change until DB change succeeds
    let tempUser = { ...user, roles: [ ...user.roles ] };
    tempUser.roles.splice(index, 1);
    if (tempUser.roles.length === 0) {
      tempUser = { ...tempUser, oldRoles: [ 'learner' ] };
    }
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).subscribe((response) => {
      console.log('Success!');
      user.roles.splice(index, 1);
      user._rev = response.rev;
      user.oldRoles = response.oldRoles;
    }, (error) => {
      // Placeholder for error handling until we have popups for user notification.
      console.log('Error!');
      console.log(error);
    });
  }

  roleSubmit(users: any[], role: any[]) {
    forkJoin(users.reduce((observers, userInfo) => {
      const user = userInfo.doc;
      // Do not add role if it already exists on user and also not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds (manually deep copy roles array)
        const tempUser = { ...user, roles: [ ...user.roles ] };
        this.updatedRole = role.length === 0 ? user.roles : role.concat(tempUser.roles).reduce(this.dedupeShelfReduce, []);
        user.roles = this.updatedRole;
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, user));
      }
      return observers;
    }, []))
    .debug('Adding role to users')
    .subscribe((responses) => {
      users.map((userInfo) => {
        const user = userInfo.doc;
        if (user.isUserAdmin === false) {
          // Add role to UI and update rev from CouchDB response
          user.roles = this.updatedRole;
          const res: any = responses.find((response: any) => response.id === user._id);
          user._rev = res.rev;
        }
      });
    }, (error) => {
      // Placeholder for error handling until we have popups for user notification.
      console.log('Error!');
      console.log(error);
    });
  }

  dedupeShelfReduce(ids, id) {
    if (ids.indexOf(id) > -1) {
      return ids;
    }
    return ids.concat(id);
  }

  updateShelf(myTeamIds: string[] = [], userShelf: any, msg: string) {
    this.couchService.put('shelf/' + this.userService.get()._id, { ...userShelf, myTeamIds }).subscribe((res) =>  {
      this.userService.setShelf({ ...userShelf, _rev: res.rev, myTeamIds });

      this.planetMessageService.showAlert(msg + ' your shelf');
    }, (error) => (error));
  }

  addTeams(users) {
    const userShelf = this.userService.getUserShelf();
    const myTeamIds = users.map((data) => {
      return data._id || data.doc._id;
    }).concat(userShelf.myTeamIds).reduce(this.dedupeShelfReduce, []);
    const msg = (myTeamIds.length === 1 ? 'User' : 'Users') + ' added to';
    this.updateShelf(myTeamIds, userShelf, msg);
  }

  removeTeam(teamId) {
    const userShelf = this.userService.getUserShelf();
    const myTeamIds = [ ...userShelf.myTeamIds ];
    myTeamIds.splice(myTeamIds.indexOf(teamId), 1);
    this.updateShelf(myTeamIds, userShelf, 'User removed from ');
  }

  back() {
    this.router.navigate([ '/' ]);
  }

  selectAll(select: NgModel, values, array) {
    select.update.emit(values);
  }

  deselectAll(select: NgModel) {
    select.update.emit([]);
  }

}
