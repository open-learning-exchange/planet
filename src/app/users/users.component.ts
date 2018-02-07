import { Component, OnInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs/observable/forkJoin';

import { MatTableDataSource } from '@angular/material';

@Component({
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  name = '';
  roles: string[] = [];
  allUsers = new MatTableDataSource();
  message = '';
  displayTable = true;
  displayedColumns = [ 'name', 'roles', 'action' ];

  // List of all possible roles to add to users
  roleList: string[] = [ 'intern', 'learner', 'teacher' ];
  selectedRole = '';

  constructor(
    private userService: UserService,
    private couchService: CouchService
  ) {}

  select(user: any) {
    // Can't add roles to admins, so only select users
    if (user._id) {
      // Will not be defined at first, so use ternary operator rather than !=
      user.selected = user.selected ? false : true;
    }
  }

  ngOnInit() {
    Object.assign(this, this.userService.get());
    if (this.roles.indexOf('_admin') > -1) {
      this.initializeData();
    } else {
      // A non-admin user cannot receive all user docs
      this.message = 'Access restricted to admins';
      this.displayTable = false;
    }
  }

  getUsers() {
    return this.couchService.get('_users/_all_docs?include_docs=true');
  }

  getAdmins() {
    // This nonode@nohost is working for couchdb as setup by Vagrant, but may need to be changed for other implementations
    return this.couchService.get('_node/nonode@nohost/_config/admins');
  }

  initializeData() {
    forkJoin([
      this.getUsers(),
      this.getAdmins()
    ]).debug('Getting user list').subscribe((data) => {

      const admins = [],
        adminData = data[1];
      for (const key in adminData) {
        if (adminData.hasOwnProperty(key)) {
          admins.push({ name: key, roles: [ 'admin' ], admin: true });
        }
      }

      this.allUsers.data = [].concat(
        data[0].rows.reduce((users: any[], user: any) => {
          if (user.id !== '_design/_auth') {
            users.push({ ...user.doc, admin: false });
          }
          return users;
        }, []),
        admins
      );

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
    const tempUser = { ...user, roles: [ 'learner' ] };
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
      // Do not add role if it already exists on user
      if (user.selected && user.roles.indexOf(role) === -1) {
        // Make copy of user so UI doesn't change until DB change succeeds (manually deep copy roles array)
        const tempUser = { ...user, roles: [ ...user.roles ] };
        // Remove selected property so it doesn't get saved to DB
        delete tempUser.selected;
        tempUser.roles.push(role);
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, []))
    .debug('Adding role to users')
    .subscribe((responses) => {
      users.map((user) => {
        if (user.selected && user.roles.indexOf(role) === -1) {
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

}
