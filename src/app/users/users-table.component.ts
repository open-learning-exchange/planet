import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, of, forkJoin, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  filterSpecificFieldsByWord, composeFilterFunctions, filterFieldExists, sortNumberOrString, filterDropdowns, filterAdmin
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
    .mat-column-birthDate, .mat-column-lastVisit, mat-progress-bar {
      max-width: 225px;
    }
    mat-cell p {
      margin: 0;
    }
  ` ]
})
export class UsersTableComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  @Input() displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
  @Input() users: any[];
  @Input() containerClass: string;
  @Input() matSortActive = '';
  @Input()
  get search() {
    return this.usersTable.filter;
  }
  set search(newSearch: string) {
    this.usersTable.filter = newSearch || ' ';
  }
  private _filter: { 'doc.roles': string, 'doc.planetCode': string } = { 'doc.roles' : '', 'doc.planetCode': '' };
  @Input()
  get filter() {
    return this._filter;
  }
  set filter(newFilter) {
    // Trigger filter changes in the Material table
    this.usersTable.filter = this.usersTable.filter;
    this._filter = newFilter;
  }
  private _tableState: TableState;
  @Input()
  get tableState(): TableState {
    return this._tableState;
  }
  set tableState(newState: TableState) {
    this.filter['doc.planetCode'] = newState.selectedChild.code ||
      (newState.filterType === 'associated' ? undefined : this.configuration.code);
    this.filterType = newState.filterType;
    this._tableState = newState;
  }
  @Input() linkPrefix: string;
  @Output() tableStateChange = new EventEmitter<TableState>();
  @Output() tableDataChange = new EventEmitter<any[]>();
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
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
      if (item.health && item.health[property]) {
        return sortNumberOrString(item.health, property);
      }
      return sortNumberOrString(item.doc, property);
    };
    this.selection.changed.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.tableState = { ...this.tableState, isOnlyManagerSelected: this.onlyManagerSelected() };
    });
    this.usersTable.filterPredicate = this.filterPredicate();
    this.usersTable.connect().subscribe(data => {
      if (this.usersTable.paginator) {
        this.tableDataChange.emit(data);
      }
    });
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
    this.router.navigate([ this.linkPrefix || 'profile', userName, optParams ], { relativeTo: this.route });
  }

  trackByFn(index, item) {
    return item._id;
  }

  filterPredicate() {
    return (data, filter) => this.filter['doc.roles'] === 'admin' ?
      filterAdmin(data, filter) :
      composeFilterFunctions([
        filterDropdowns(this.filter),
        filterFieldExists([ 'doc.requestId' ], this.filterType === 'associated'),
        filterSpecificFieldsByWord([ 'fullName' ])
      ])(data, filter);
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
    const request: Observable<any> = type === 'admin' ?
      this.usersService.toggleAdminStatus(user) :
      this.usersService.toggleManagerStatus(user);
    request.subscribe(
      () => {
        this.usersService.requestUsers(true);
        this.planetMessageService.showMessage(`${user.name} ${isDemotion ? 'demoted from' : 'promoted to'} ${type}`);
      },
      () => this.planetMessageService.showAlert(`There was an error ${isDemotion ? 'demoting' : 'promoting'} user`)
    );
  }

  setRoles(user, roles, event) {
    event.stopPropagation();
    this.usersService.setRoles(user, roles).subscribe(() => {
      this.usersService.requestUsers(true);
      this.planetMessageService.showMessage(`${user.name} roles modified`);
    });
  }

  onPageChange(e: PageEvent) {
    console.log(e);
  }

}
