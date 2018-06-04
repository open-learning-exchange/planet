import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { environment } from '../../environments/environment';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent, MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, catchError, map, takeUntil } from 'rxjs/operators';
import { filterSpecificFields } from '../shared/table-helpers';
import { of } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import { Subject } from 'rxjs/Subject';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { findDocuments } from '../shared/mangoQueries';
import { debug } from '../debug-operator';

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
  deleteDialog: any;
  // List of all possible roles to add to users
  roleList: string[] = [ 'learner', 'leader' ];
  selectedRoles: string[] = [];
  selection = new SelectionModel(true, []);
  private dbName = '_users';
  urlPrefix = environment.couchAddress + this.dbName + '/';
  userShelf = this.userService.shelf;
  private onDestroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private planetMessageService: PlanetMessageService
  ) {
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.setMyTeams(this.allUsers.data, shelf.myTeamIds);
      });
    }

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    if (this.isUserAdmin || this.userService.get().roles.length) {
      this.initializeData();
    } else {
      // Inactive users cannot receive all user docs
      this.planetMessageService.showAlert('You are not authorized. Please contact administrator.');
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
    this.allUsers.data.forEach((row: any) => this.selection.select(row.doc._id));
  }

  getUsers() {
    return this.couchService.post(this.dbName + '/_find', { 'selector': { } });
  }

  initializeData() {
    const currentLoginUser = this.userService.get().name;
    this.selection.clear();
    this.getUsers().pipe(debug('Getting user list')).subscribe(users => {
      users = users.docs.filter((user: any) => {
        // Removes current user from list.  Users should not be able to change their own roles,
        // so this protects from that.  May need to unhide in the future.
        if (currentLoginUser !== user.name) {
          return user;
        }
      }).map((user: any) => {
        const userInfo = { doc: user, imageSrc: '', myTeamInfo: true };
        if (user._attachments) {
          userInfo.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
        }
        return userInfo;
      });
      this.setMyTeams(users, this.userService.shelf.myTeamIds);
      this.allUsers.filterPredicate = filterSpecificFields([ 'doc.name' ]);
    }, (error) => {
      // A bit of a placeholder for error handling.  Request will return error if the logged in user is not an admin.
      console.log('Error initializing data!');
      console.log(error);
    });
  }

  deleteClick(user) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteUser(user),
        amount: 'single',
        changeType: 'delete',
        type: 'user',
        displayName: user.name,
        extraMessage: user.requestId ? '' : 'Planet associated with it will be disconnected.'
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  deleteUser(user) {
    const userId = 'org.couchdb.user:' + user.name;
    // Return a function with user on its scope to pass to delete dialog
    return () => {
      this.couchService.get('shelf/' + userId).pipe(
        switchMap(shelfUser => {
          return forkJoin([
            this.couchService.delete('_users/' + userId + '?rev=' + user._rev),
            this.couchService.delete('shelf/' + userId + '?rev=' + shelfUser._rev)
          ]);
        }),
        catchError((err) => {
          // If deleting user fails, do not continue stream and show error
          this.planetMessageService.showAlert('There was a problem deleting this user.');
          return _throw(err);
        }),
        switchMap((data) => {
          this.selection.deselect(user._id);
          this.planetMessageService.showMessage('User deleted: ' + user.name);
          this.deleteDialog.close();
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.allUsers.data = this.allUsers.data.filter((u: any) => data[0].id !== u.doc._id);
          return this.removeDeletedUserFromShelves(userId);
        })
      ).subscribe(() => { });
    };
  }

  removeDeletedUserFromShelves(userId) {
    const myUserId = 'org.couchdb.user:' + this.userService.get().name;
    return this.couchService.post('shelf/_find', findDocuments({ 'myTeamIds': { '$in': [ userId ] } })).pipe(
      map(shelves => {
        return shelves.docs.map(shelf => {
          const myTeamIds = [ ...shelf.myTeamIds ];
          myTeamIds.splice(myTeamIds.indexOf(userId), 1);
          return { ...shelf, myTeamIds };
        });
      }),
      switchMap(newShelves => {
        return this.couchService.post('shelf/_bulk_docs', { docs: newShelves });
      })
    );
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

  roleSubmit(users: any[], roles: string[]) {
    forkJoin(users.reduce((observers, userInfo) => {
      const user = userInfo.doc;
      // Do not add role if it already exists on user and also not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds (manually deep copy roles array)
        const newRoles = [ ...user.roles, ...roles ].reduce(this.dedupeShelfReduce, []);
        const tempUser = { ...user, roles: newRoles };
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, []))
    .pipe(debug('Adding role to users'))
    .subscribe((responses) => {
      users.map((userInfo) => {
        const user = userInfo.doc;
        if (user.isUserAdmin === false) {
          // Add role to UI and update rev from CouchDB response
          user.roles = [ ...user.roles, ...roles ].reduce(this.dedupeShelfReduce, []);
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
      this.userService.shelf = { ...userShelf, _rev: res.rev, myTeamIds };

      this.planetMessageService.showMessage(msg + ' your shelf');
    }, (error) => (error));
  }

  addTeams(users) {
    const userShelf = this.userService.shelf;
    const myTeamIds = users.map((data) => {
      return data.doc._id;
    }).concat(userShelf.myTeamIds).reduce(this.dedupeShelfReduce, []);
    const addedNum = myTeamIds.length - userShelf.myTeamIds.length;
    const subjectVerbAgreement = addedNum === 1 ? 'user has' : 'users have';
    const msg = (users.length === 1 && addedNum === 1 ?
      users[0].doc.name + ' has been'
      : addedNum + ' ' + subjectVerbAgreement + ' been')
      + ' added to';
    this.updateShelf(myTeamIds, userShelf, msg);
  }

  removeTeam(teamId, userName) {
    const userShelf = this.userService.shelf;
    const myTeamIds = [ ...userShelf.myTeamIds ];
    myTeamIds.splice(myTeamIds.indexOf(teamId), 1);
    this.updateShelf(myTeamIds, userShelf, userName + ' has been removed from');
  }

  back() {
    this.router.navigate([ '/' ]);
  }

  updateSelectedRoles(newSelection: string[]) {
    this.selectedRoles = newSelection;
  }

}
