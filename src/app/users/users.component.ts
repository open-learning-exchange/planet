import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';

import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { forkJoin, Subject, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent, MatDialog } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { switchMap, takeUntil, debounceTime, map } from 'rxjs/operators';
import {
  filterSpecificFields, composeFilterFunctions, filterFieldExists, sortNumberOrString, filterDropdowns
} from '../shared/table-helpers';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { debug } from '../debug-operator';
import { dedupeShelfReduce } from '../shared/utils';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ReportsService } from '../manager-dashboard/reports/reports.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { TeamsService } from '../teams/teams.service';

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
  selectedChild: any = {};
  filterType = 'local';
  filter: any;
  planetType = '';
  displayTable = true;
  displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
  isUserAdmin = false;
  deleteDialog: any;
  children: any;
  // List of all possible roles to add to users
  roleList: string[] = [ 'leader', 'monitor' ];
  selectedRoles: string[] = [];
  selection = new SelectionModel(true, []);
  private dbName = '_users';
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  userShelf = this.userService.shelf;
  private onDestroy$ = new Subject<void>();
  emptyData = false;
  private searchChange = new Subject<string>();

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private teamsService: TeamsService,
    private couchService: CouchService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private reportsService: ReportsService,
    private dialogsLoadingService: DialogsLoadingService,
    private managerService: ManagerService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.planetType = this.stateService.configuration.planetType;
    this.isUserAdmin = this.userService.get().isUserAdmin;
    this.route.paramMap.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((params: ParamMap) => {
      this.applyFilter(params.get('search'));
    });
    this.initializeData();
    this.allUsers.sortingDataAccessor = (item: any, property) => {
      if (item[property]) {
        return sortNumberOrString(item, property);
      }
      return sortNumberOrString(item.doc, property);
    };
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  changeFilter(type, child: any = {}) {
    this.filterDisplayColumns(type);
    this.filterType = type;
    this.selectedChild = child;
    this.allUsers.filterPredicate = composeFilterFunctions([
      filterDropdowns(
        this.filterType === 'associated' ? { 'doc.roles': [ 'leader', 'learner' ] }
        : { 'doc.planetCode': child.code || this.stateService.configuration.code }
      ),
      filterFieldExists([ 'doc.requestId' ], this.filterType === 'associated'),
      filterSpecificFields([ 'doc.name' ])
    ]);
    this.allUsers.filter = this.allUsers.filter || ' ';
    this.searchChange.pipe(debounceTime(500)).subscribe((searchText) => {
      this.router.navigate([ '..', searchText ? { search: searchText } : {} ], { relativeTo: this.route });
    });
  }

  filterDisplayColumns(type: string) {
    if (type === 'local') {
      this.displayedColumns = [ 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
      if (this.isUserAdmin) {
        this.displayedColumns.unshift('select');
      }
    } else {
      this.displayedColumns = [ 'profile', 'name', 'joinDate', 'lastLogin', 'action' ];
    }
  }

  applyFilter(filterValue: string) {
    this.searchValue = filterValue;
    this.allUsers.filter = filterValue;
    this.changeFilter(this.filterType);
  }

  searchChanged(searchText: string) {
    this.searchChange.next(searchText);
  }

  ngAfterViewInit() {
    this.allUsers.sort = this.sort;
    this.allUsers.paginator = this.paginator;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.allUsers.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row.doc._id));
  }

  getUsersAndLoginActivities() {
    return forkJoin([
      this.couchService.findAll(this.dbName, { 'selector': {}, 'limit': 100 }),
      this.couchService.findAll('login_activities', { 'selector': {}, 'limit': 100 }),
      this.couchService.findAll('child_users', { 'selector': {} }),
      this.managerService.getChildPlanets(true).pipe(map(
        (state) => this.reportsService.attachNamesToPlanets(state)
      ))

    ]);
  }

  initializeData() {
    const currentLoginUser = this.userService.get().name;
    this.selection.clear();
    this.getUsersAndLoginActivities().pipe(debug('Getting user list')).subscribe(([ users, loginActivities, childUsers, communities ]) => {
      this.children = communities;
      this.allUsers.data = users.filter((user: any) => {
        // Removes current user and special satellite user from list.  Users should not be able to change their own roles,
        // so this protects from that.  May need to unhide in the future.
        return currentLoginUser !== user.name && user.name !== 'satellite';
      }).concat(childUsers)
      .map((user: any) => {
        const userInfo = {
          doc: user,
          imageSrc: '',
          visitCount: this.userLoginCount(user, loginActivities),
          lastLogin: this.userLastLogin(user, loginActivities)
        };
        if (user._attachments) {
          userInfo.imageSrc = this.urlPrefix + 'org.couchdb.user:' + user.name + '/' + Object.keys(user._attachments)[0];
        }
        return userInfo;
      });
      this.emptyData = !this.allUsers.data.length;
      this.dialogsLoadingService.stop();
    }, (error) => {
      // A bit of a placeholder for error handling.  Request will return error if the logged in user is not an admin.
      console.log('Error initializing data!');
      console.log(error);
    });
  }

  deleteClick(user, event) {
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
    event.stopPropagation();
  }

  deleteUserFromTeams(user) {
    return this.couchService.findAll('teams', { selector: { userId: user._id }}).pipe(
      switchMap(teams => {
        const docsWithUser = teams.map(doc => ({ ...doc, _deleted: true }));
        return this.couchService.bulkDocs('teams', docsWithUser)
      })
    )
  }

  deleteUser(user) {
    const userId = 'org.couchdb.user:' + user.name;

    return {
      request: this.couchService.get('shelf/' + userId).pipe(
        switchMap(shelfUser => {
          return forkJoin([
            this.couchService.delete('_users/' + userId + '?rev=' + user._rev),
            this.couchService.delete('shelf/' + userId + '?rev=' + shelfUser._rev),
            this.deleteUserFromTeams(user)
          ]);
        })
      ),
      onNext: (data) => {
        this.selection.deselect(user._id);
        this.planetMessageService.showMessage('User deleted: ' + user.name);
        this.deleteDialog.close();
        // It's safer to remove the item from the array based on its id than to splice based on the index
        this.allUsers.data = this.allUsers.data.filter((u: any) => data[0].id !== u.doc._id);
      },
      onError: () => this.planetMessageService.showAlert('There was a problem deleting this user.')
    };
  }

  setRoles(user, roles, event) {
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
    event.stopPropagation();
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
      // Do not allow an admin to be given another role
      if (user.isUserAdmin === false) {
        // Make copy of user so UI doesn't change until DB change succeeds
        const tempUser = { ...user, roles: [ 'learner', ...roles ] };
        observers.push(this.couchService.put('_users/org.couchdb.user:' + tempUser.name, tempUser));
      }
      return observers;
    }, []))
    .pipe(debug('Adding role to users'))
    .subscribe((responses) => {
      users.map((user) => {
        if (user.isUserAdmin === false) {
          // Add role to UI and update rev from CouchDB response
          user.roles = [ 'learner', ...roles ];
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
    // relative path for /users and /team/users based on depth
    const userUrl = this.router.url.split('/');
    const path = userUrl[1] === 'users' ? '../' : '../../';
    this.router.navigate([ path ], { relativeTo: this.route });
  }

  updateSelectedRoles(newSelection: string[]) {
    this.selectedRoles = newSelection;
  }

  userLoginCount(user: any, loginActivities: any[]) {
    return loginActivities.filter((logItem: any) => logItem.user === user.name).length;
  }

  userLastLogin(user: any, loginActivities: any[]) {
    return loginActivities.filter((logItem: any) => logItem.user === user.name)
      .reduce((max: number, log: any) => log.loginTime > max ? log.loginTime : max, '');
  }

  gotoProfileView(userName: string) {
    const optParams = this.selectedChild.code ? { planet: this.selectedChild.code } : {};
    this.router.navigate([ 'profile', userName, optParams ], { relativeTo: this.route });
  }

}
