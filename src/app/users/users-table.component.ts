import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { MatTableDataSource, MatSort, MatPaginator, PageEvent, MatDialog, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, of, forkJoin, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  filterSpecificFields, composeFilterFunctions, filterFieldExists, sortNumberOrString, filterDropdowns
} from '../shared/table-helpers';
import { findByIdInArray } from '../shared/utils';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UsersService } from './users.service';
import { PlanetMessageService } from '../shared/planet-message.service';

export class TableState {
  isOnlyManagerSelected = false;
  selectedChild: any = {};
  filterType = 'local';
}

@Component({
  selector: 'planet-users-table',
  templateUrl: './users-table.component.html',
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
export class UsersTableComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
  @Input() users: any[];
  @Input()
  get search() {
    return this.usersTable.filter;
  }
  set search(newSearch: string) {
    this.usersTable.filter = newSearch || ' ';
  }
  private _filter: { 'doc.roles': string[] | '', 'doc.planetCode': string } = { 'doc.roles' : '', 'doc.planetCode': '' };
  @Input()
  get filter() {
    return this._filter;
  }
  set filter(newFilter) {
    // Trigger filter changes in the Material table
    this.usersTable.filter = this.usersTable.filter;
    this._filter = newFilter;
  }
  @Input() tableState: TableState;
  @Output() tableStateChange = new EventEmitter<TableState>();
  @ViewChild(MatSort, { static: false }) sort: MatSort;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  usersTable = new MatTableDataSource();
  filterType = 'local';
  isUserAdmin = false;
  selection = new SelectionModel(true, []);
  private onDestroy$ = new Subject<void>();
  isOnlyManagerSelected = false;
  configuration = this.stateService.configuration;
  deleteDialog: MatDialogRef<DialogsPromptComponent>;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private usersService: UsersService,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService
  ) {}

  ngOnInit() {
    this.isUserAdmin = this.userService.get().isUserAdmin;
    this.usersTable.sortingDataAccessor = (item: any, property) => {
      if (item[property]) {
        return sortNumberOrString(item, property);
      }
      return sortNumberOrString(item.doc, property);
    };
    this.selection.changed.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.tableState = { ...this.tableState, isOnlyManagerSelected: this.onlyManagerSelected() };
    });
    this.usersTable.filterPredicate = (data, filter) => composeFilterFunctions([
      filterDropdowns(this.filter),
      filterFieldExists([ 'doc.requestId' ], this.filterType === 'associated'),
      filterSpecificFields([ 'fullName' ])
    ])(data, filter);
  }

  ngOnChanges() {
    this.usersTable.data = this.users;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  ngAfterViewInit() {
    this.usersTable.sort = this.sort;
    this.usersTable.paginator = this.paginator;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }

  onlyManagerSelected() {
    return this.selection.selected.every((user) => findByIdInArray(this.usersTable.data, user).doc.isUserAdmin === true);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.usersTable.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row.doc._id));
  }

  gotoProfileView(userName: string) {
    const optParams = this.tableState.selectedChild.code ? { planet: this.tableState.selectedChild.code } : {};
    this.router.navigate([ 'profile', userName, optParams ], { relativeTo: this.route });
  }

  trackByFn(index, item) {
    return item._id;
  }

  deleteClick(user, event) {
    event.stopPropagation();
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.usersService.deleteUser(user),
          onNext: () => {
            this.selection.deselect(user._id);
            this.planetMessageService.showMessage('User deleted: ' + user.name);
            this.deleteDialog.close();
          },
          onError: () => this.planetMessageService.showAlert('There was a problem deleting this user.')
        },
        amount: 'single',
        changeType: 'delete',
        type: 'user',
        displayName: user.name,
        extraMessage: user.requestId ? 'Planet associated with it will be disconnected.' : ''
      }
    });
  }

  removeRole(user: any, roleIndex: number) {
    this.usersService.setRolesForUsers([ user ], [ ...user.roles.slice(0, roleIndex), ...user.roles.slice(roleIndex + 1) ])
      .subscribe(() => {}, () => this.planetMessageService.showAlert('There was an error removing the member\'s role'));
  }

  toggleStatus(event, user, type: 'admin' | 'manager', isDemotion: boolean) {
    event.stopPropagation();
    ((type === 'admin' ? this.toggleAdminStatus(user) : this.toggleManagerStatus(user)) as Observable<any>).subscribe(
      () => {
        this.usersService.requestUsers();
        this.planetMessageService.showMessage(`${user.name} ${isDemotion ? 'demoted from' : 'promoted to'} ${type}`);
      },
      () => this.planetMessageService.showAlert(`There was an error ${isDemotion ? 'demoting' : 'promoting'} user`)
    );
  }

  toggleAdminStatus(user) {
    return user.roles.length === 0 ? this.usersService.demoteFromAdmin(user) : this.usersService.promoteToAdmin(user);
  }

  toggleManagerStatus(user) {
    return forkJoin([
      this.usersService.setRoles({ ...user, isUserAdmin: !user.isUserAdmin }, user.isUserAdmin ? user.oldRoles : [ 'manager' ]),
      user.isUserAdmin ? of({}) : this.usersService.removeFromTabletUsers(user)
    ]);
  }

  setRoles(user, roles, event) {
    event.stopPropagation();
    this.usersService.setRoles(user, roles).subscribe(() => {
      this.usersService.requestUsers();
      this.planetMessageService.showMessage(`${user.name} roles modified`);
    });
  }

}
