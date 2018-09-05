import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin, Subject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent, MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, takeUntil } from 'rxjs/operators';
import { filterSpecificFields, composeFilterFunctions, filterFieldExists } from '../shared/table-helpers';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { debug } from '../debug-operator';
import { dedupeShelfReduce } from '../shared/utils';

@Component({
  templateUrl: './users.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }

    .mat-column-profile {
      max-width: 100px;
    }
  ` ]
})
export class UsersComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  allUsers = new MatTableDataSource();
  message = '';
  searchValue = '';
  filterAssociated = false;
  filter: any;
  planetType = '';
  displayTable = true;
  displayedColumns = [ 'select', 'profile', 'name', 'roles', 'action' ];
  isUserAdmin = false;
  deleteDialog: any;
  // List of all possible roles to add to users
  roleList: string[] = [ 'learner', 'leader' ];
  selectedRoles: string[] = [];
  selection = new SelectionModel(true, []);
  private dbName = '_users';
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  userShelf = this.userService.shelf;
  private onDestroy$ = new Subject<void>();
  emptyData = false;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.planetType = this.userService.getConfig().planetType;
    this.isUserAdmin = this.userService.get().isUserAdmin;
    this.route.paramMap.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((params: ParamMap) => {
      this.applyFilter(params.get('search'));
    });
    this.initializeData();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  changeFilter(type) {
    switch (type) {
      case 'associated':
        this.displayedColumns = [ 'profile', 'name', 'action' ];
        this.filterAssociated = true;
        break;
      default:
        this.displayedColumns = [ 'select', 'profile', 'name', 'roles', 'action' ];
        this.filterAssociated = false;
        break;
    }
    this.filter = filterFieldExists([ 'doc.requestId' ], this.filterAssociated);
    this.allUsers.filterPredicate = composeFilterFunctions([ this.filter, filterSpecificFields([ 'doc.name' ]) ]);
    this.allUsers.filter = this.allUsers.filter || ' ';
  }

  applyFilter(filterValue: string) {
    this.searchValue = filterValue;
    this.allUsers.filter = filterValue;
    this.changeFilter(this.filterAssociated ? 'associated' : 'local');
  }

  searchChanged(searchText: string) {
    this.router.navigate([ '..', searchText ? { search: searchText } : {} ], { relativeTo: this.route });
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
    const pageSize = this.paginator.pageSize;
    const leftOverRows = this.allUsers.data.length % pageSize ;
    return numSelected === pageSize || numSelected === leftOverRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.allUsers.data.slice(start, end).forEach((row: any) => this.selection.select(row.doc._id));
  }

  getUsers() {
    return this.couchService.findAll(this.dbName, { 'selector': {}, 'limit': 3 });
  }

  initializeData() {
    const currentLoginUser = this.userService.get().name;
    this.selection.clear();
    this.getUsers().pipe(debug('Getting user list')).subscribe((users: any) => {
      this.allUsers.data = users.filter((user: any) => {
        // Removes current user and special satellite user from list.  Users should not be able to change their own roles,
        // so this protects from that.  May need to unhide in the future.
        return currentLoginUser !== user.name && user.name !== 'satellite';
      }).map((user: any) => {
        const userInfo = { doc: user, imageSrc: '' };
        if (user._attachments) {
          userInfo.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
        }
        return userInfo;
      });
      this.emptyData = !this.allUsers.data.length;
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
        extraMessage: user.requestId ? 'Planet associated with it will be disconnected.' : ''
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
        })
      ).subscribe((data) => {
        this.selection.deselect(user._id);
        this.planetMessageService.showMessage('User deleted: ' + user.name);
        this.deleteDialog.close();
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.allUsers.data = this.allUsers.data.filter((u: any) => data[0].id !== u.doc._id);
      }, () => { this.planetMessageService.showAlert('There was a problem deleting this user.'); });
    };
  }

  setRoles(user, roles) {
    const tempUser = {
      ...user,
      roles,
      oldRoles: [ ...user.roles ] || [ 'learner' ],
      isUserAdmin: roles.indexOf('manager') > -1
    };
    this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser).pipe(switchMap((response) => {
      if (tempUser.isUserAdmin) {
        return this.removeFromTabletUsers(tempUser);
      }
      return of({ });
    })).subscribe((response) => {
      console.log('Success!');
      this.initializeData();
    }, (error) => {
      console.log(error);
    });
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

  idsToUsers(userIds: any[]) {
    return userIds.map(userId => {
      const user: any = this.allUsers.data.find((u: any) => u.doc._id === userId);
      return user.doc;
    });
  }

  roleSubmit(userIds: any[], roles: string[]) {
    const users: any = this.idsToUsers(userIds);
    forkJoin(users.reduce((observers, user) => {
      // Do not add role if it already exists on user and also not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds (manually deep copy roles array)
        const newRoles = [ ...user.roles, ...roles ].reduce(dedupeShelfReduce, []);
        const tempUser = { ...user, roles: newRoles };
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, []))
    .pipe(debug('Adding role to users'))
    .subscribe((responses) => {
      users.map((user) => {
        if (user.isUserAdmin === false) {
          // Add role to UI and update rev from CouchDB response
          user.roles = [ ...user.roles, ...roles ].reduce(dedupeShelfReduce, []);
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


  removeFromTabletUsers(user) {
    return this.couchService.delete('tablet_users/' + user._id + '?rev=' + user._rev);
  }

  back() {
    this.router.navigate([ '../../' ], { relativeTo: this.route });
  }

  updateSelectedRoles(newSelection: string[]) {
    this.selectedRoles = newSelection;
  }

}
