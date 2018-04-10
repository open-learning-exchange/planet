import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';
import { MatTableDataSource, MatSort, MatPaginator } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

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
  selectedRolesMap = new Map<string, string[]>();

  // List of all possible roles to add to users
  roleList: string[] = [ 'intern', 'learner', 'teacher' ];
  selectedRole = '';
  selection = new SelectionModel(true, []);
  private dbName = '_users';
  urlPrefix = environment.couchAddress + this.dbName + '/';

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) {}

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
    this.allUsers.filter = filterValue.trim().toLowerCase();
  }

  ngAfterViewInit() {
    this.allUsers.sort = this.sort;
    this.allUsers.paginator = this.paginator;
  }

  isAllSelected() {
    this.selection.selected.map((user) => {
      /** Adding roles to user are not alowed if admin is selected */
      if (user.roles.indexOf('admin') === -1 && this.isUserAdmin) {
        user.selected = true;
      }
    });
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
    return this.couchService.allDocs('_users');
  }

  getShelf() {
    return this.couchService.post('shelf/_find', { 'selector': { '_id': this.userService.get()._id } })
    .pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      return of({ docs: [] });
    }));
  }

  initializeData() {
    this.selection.clear();
    forkJoin([ this.getUsers(), this.getShelf() ])
    .debug('Getting user list').subscribe((data) => {
      this.allUsers.data = data[0].reduce((users: any[], user: any) => {
        if (user._attachments) {
          user.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
        }
        const myTeamIndex = data[1].docs[0].myTeamIds ? data[1].docs[0].myTeamIds.findIndex(myTeamId => {
          return user._id === myTeamId;
        }) : -1;
        myTeamIndex > -1 ? users.push({ ...user, myTeamInfo: true }) : users.push({ ...user, myTeamInfo: false });
        return users;
      }, []);
    }, (error) => {
      // A bit of a placeholder for error handling.  Request will return error if the logged in user is not an admin.
      console.log('Error initializing data!');
      console.log(error);
    });
  }

  deleteRole(user: any, index: number) {
    // Make copy of user so UI doesn't change until DB change succeeds
    const tempUser = { ...user, roles: [ ...user.roles ] };
    tempUser.roles.splice(index, 1);
    this.selectedRolesMap.set(tempUser.name, tempUser.roles);
    delete tempUser.selected;
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).subscribe((response) => {
      console.log('Success!');
      user.roles.splice(index, 1);
      user._rev = response.rev;
    }, (error) => {
      // Placeholder for error handling until we have popups for user notification.
      console.log('Error!');
      console.log(error);
    });
  }

  addRole(user) {
    // If user has no previous role, add learner role
    let selectedRolesArray = this.selectedRolesMap.get(user.name);
    if (this.selectedRolesMap.get(user.name) === undefined || this.selectedRolesMap.get(user.name).length === 0) {
      selectedRolesArray = [ 'learner' ];
    }
    const tempUser = { ...user, roles: [ ...selectedRolesArray ] };
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).subscribe((response) => {
      console.log('Success!');
      this.initializeData();
    }, (error) => {
      console.log(error);
    });
  }

  removeRole(user) {
    const tempUser = { ...user, roles: [ ] };
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).subscribe((response) => {
      console.log('Success!');
      this.initializeData();
    }, (error) => {
      console.log(error);
    });
  }

  roleSubmit(users: any[], role: string) {
    forkJoin(users.reduce((observers, user, index) => {
      // Do not add role if it already exists on user and also not allow an admin to be given another role
      if (user.selected && user.roles.indexOf(role) === -1 && user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds (manually deep copy roles array)
        const tempUser = { ...user, roles: [ ...user.roles ] };
        // Remove selected property so it doesn't get saved to DB
        delete tempUser.selected;
        tempUser.roles.push(role);
        this.selectedRolesMap.set(tempUser.name, tempUser.roles);
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, []))
    .debug('Adding role to users')
    .subscribe((responses) => {
      users.map((user) => {
        if (user.selected && user.roles.indexOf(role) === -1 && user.isUserAdmin === false) {
          // Add role to UI and update rev from CouchDB response
          user.roles.push(role);
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

  addTeams(userId) {
    const userIdArray = userId.map((data) => {
      return data._id;
    });
    this.couchService.post(`shelf/_find`, { 'selector': { '_id': this.userService.get()._id } })
      .pipe(
        map(data => {
          return { rev: { _rev: data.docs[0]._rev }, resourceIds: data.docs[0].resourceIds || [], myTeamIds: data.docs[0].myTeamIds || [] };
        }),
        // If there are no matches, CouchDB throws an error
        // User has no "shelf", and it needs to be created
        catchError(err => {
          // Observable of continues stream
          return of({ rev: {}, resourceIds: [], myTeamIds: [] });
        }),
        switchMap(data => {
          const myTeamIds = userIdArray.concat(data.myTeamIds).reduce(this.dedupeShelfReduce, []);
          return this.couchService.put('shelf/' + this.userService.get()._id,
            Object.assign(data.rev, { myTeamIds, resourceIds: data.resourceIds } ));
        })
      ).subscribe((res) =>  {
        this.initializeData();
        const msg = userIdArray.length === 1 ? 'User' : 'Users';
        this.planetMessageService.showAlert(msg + ' added to your shelf');
    }, (error) => (error));
  }

  removeTeam (teamId) {
    this.getShelf().pipe(switchMap(data => {
      data.docs[0].myTeamIds.splice(data.docs[0].myTeamIds.indexOf(teamId), 1);
      return this.couchService.put('shelf/' + this.userService.get()._id, data.docs[0]);
    })).subscribe(data => {
      this.initializeData();
      this.planetMessageService.showAlert('User removed from shelf');
    }, (error) => (error));
  }

  back() {
    this.router.navigate([ '/' ]);
  }

}
