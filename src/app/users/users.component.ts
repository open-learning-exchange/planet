import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';

import { UserService } from '../shared/user.service';
import { Subject } from 'rxjs';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { PlanetMessageService } from '../shared/planet-message.service';
import { takeUntil, debounceTime, map } from 'rxjs/operators';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ManagerService } from '../manager-dashboard/manager.service';
import { UsersService } from './users.service';
import { TableState, UsersTableComponent } from './users-table.component';
import { attachNamesToPlanets, sortPlanet } from '../manager-dashboard/reports/reports.utils';

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
export class UsersComponent implements OnInit, OnDestroy {

  @ViewChild('table') usersTable: UsersTableComponent;
  users: any[] = [];
  message = '';
  searchValue = '';
  filter = { 'doc.roles' : '' };
  planetType = '';
  displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
  isUserAdmin = false;
  children: any;
  roleList = this.usersService.roleList;
  allRolesList = this.usersService.allRolesList;
  selectedRoles: string[] = [];
  filteredRole: string;
  userShelf = this.userService.shelf;
  private onDestroy$ = new Subject<void>();
  emptyData = false;
  private searchChange = new Subject<string>();
  configuration = this.stateService.configuration;
  tableState = new TableState();

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private managerService: ManagerService,
    private usersService: UsersService,
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
    this.managerService.getChildPlanets(true).pipe(map(
      (state) => attachNamesToPlanets(state)
    )).subscribe(childPlanets => this.children = childPlanets.sort(sortPlanet));
    this.usersService.usersListener().pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      this.dialogsLoadingService.stop();
      this.users = users;
    });
    this.usersService.requestUserData();
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  changePlanetFilter(type, child: any = {}) {
    this.filterDisplayColumns(type);
    this.tableState = { ...this.tableState, filterType: type, selectedChild: child };
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
    this.changePlanetFilter(this.tableState.filterType);
  }

  searchChanged(searchText: string) {
    this.searchChange.next(searchText);
  }

  idsToUsers(userIds: any[]) {
    return userIds.map(userId => {
      const user: any = this.users.find((u: any) => u.doc._id === userId);
      return user.doc;
    });
  }

  roleSubmit(roles) {
    const userIds = this.usersTable.selection.selected;
    this.usersService.setRolesForUsers(this.idsToUsers(userIds), roles).subscribe(
      () => {
        this.usersService.requestUsers(true);
        this.planetMessageService.showMessage('Roles updated');
      },
      () => this.planetMessageService.showAlert('There was an error adding role(s) to member(s)')
    );
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

  onFilterChange(filterValue: string) {
    this.filter = { ...this.filter, 'doc.roles': filterValue === 'All' ? '' : filterValue };
    this.changePlanetFilter(this.tableState.filterType, this.tableState.selectedChild);
  }

  resetFilter() {
    this.filteredRole = 'All';
    this.filter = { ...this.filter, 'doc.roles': '' };
    this.applyFilter('');
  }
}
