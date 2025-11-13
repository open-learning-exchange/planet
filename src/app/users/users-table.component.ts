import {
  Component, OnInit, OnDestroy, ViewChild, AfterViewInit, Input, Output, EventEmitter, OnChanges, HostListener
} from '@angular/core';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator, LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  filterSpecificFieldsByWord, composeFilterFunctions, filterFieldExists, sortNumberOrString, filterDropdowns, filterAdmin, trackById
} from '../shared/table-helpers';
import { UserService } from '../shared/user.service';
import { StateService } from '../shared/state.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { UsersService } from './users.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserProfileDialogComponent } from './users-profile/users-profile-dialog.component';
import { itemsShown } from '../shared/utils';

export class TableState {
  isOnlyManagerSelected = false;
  selectedChild: any = {};
  filterType = 'local';
}

@Component({
  selector: 'planet-users-table',
  templateUrl: './users-table.component.html',
  styleUrls: [ './users-table.scss' ]
})
export class UsersTableComponent implements OnInit, OnDestroy, AfterViewInit, OnChanges {

  @Input() displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
  @Input() users: any[];
  @Input() containerClass: string;
  @Input() matSortActive = '';
  @Input() isDialog = false;
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
  get tableData() {
    return this.usersTable;
  }
  @Input() shouldOpenProfileDialog = false;
  @Input() isLoading = false;
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
  deviceType: DeviceType;
  isMobile: boolean;
  trackById = trackById;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private usersService: UsersService,
    private router: Router,
    private route: ActivatedRoute,
    private stateService: StateService,
    private planetMessageService: PlanetMessageService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
  }

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
    if (this.isDialog) {
      this.displayedColumns = [ 'select', 'profile', 'name', 'visitCount', 'joinDate', 'lastLogin', 'roles' ];
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  ngAfterViewInit() {
    if (!this.isDialog && !this.isUserAdmin) {
      this.displayedColumns = this.displayedColumns.filter(column => column !== 'select');
    }
    this.usersTable.sort = this.sort;
    this.usersTable.paginator = this.paginator;
  }

  @HostListener('window:resize') onResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isMobile = this.deviceType === DeviceType.MOBILE;
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  isSelected(user) {
    return this.selection.selected.find(selected => selected._id === user._id && selected.planetCode === user.planetCode);
  }

  isAllSelected() {
    return this.selection.selected.length === itemsShown(this.paginator);
  }

  onlyManagerSelected() {
    return this.selection.selected.every((user) => user.isUserAdmin === true);
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.usersTable.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row.doc));
  }

  gotoProfileView(userName: string) {
    if (this.isDialog) {
      return;
    }
    if (this.shouldOpenProfileDialog) {
      const code = this.tableState.selectedChild.code ? { planet: this.tableState.selectedChild.code } : null;
      this.dialog.open(UserProfileDialogComponent, { data: { member: { name: userName, userPlanetCode: code } }, autoFocus: false });
      return;
    }
    const optParams = this.tableState.selectedChild.code ? { planet: this.tableState.selectedChild.code } : {};
    this.router.navigate([ 'profile', userName, optParams ], { relativeTo: this.route });
  }

  filterPredicate() {
    return (data, filter) => composeFilterFunctions([
      filterDropdowns({ ...this.filter, 'doc.roles': this.filter['doc.roles'] === 'admin' ? '' : this.filter['doc.roles'] }),
      filterFieldExists([ 'doc.requestId' ], this.filterType === 'associated'),
      filterSpecificFieldsByWord([ 'fullName' , 'doc.name' ]),
      () => this.filter['doc.roles'] === 'admin' ? filterAdmin(data, filter) : true
    ])(data, filter);
  }

  deleteClick(user, event) {
    event.stopPropagation();
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: {
          request: this.usersService.deleteUser(user),
          onNext: () => {
            this.selection.deselect(user);
            this.planetMessageService.showMessage($localize`User deleted: ${user.name}`);
            this.deleteDialog.close();
          },
          onError: () => this.planetMessageService.showAlert($localize`There was a problem deleting this user.`)
        },
        amount: 'single',
        changeType: 'delete',
        type: 'user',
        displayName: user.name,
        extraMessage: user.requestId ? $localize`Planet associated with it will be disconnected.` : ''
      }
    });
  }

  removeRole(user: any, roleIndex: number) {
    this.usersService.setRolesForUsers([ user ], [ ...user.roles.slice(0, roleIndex), ...user.roles.slice(roleIndex + 1) ])
      .subscribe(() => {}, () => this.planetMessageService.showAlert($localize`There was an error removing the member\'s role`));
  }

  toggleStatus(event, user, type: 'admin' | 'manager', isDemotion: boolean) {
    event.stopPropagation();
    const request: Observable<any> = type === 'admin' ?
      this.usersService.toggleAdminStatus(user) :
      this.usersService.toggleManagerStatus(user);
    request.subscribe(
      () => {
        this.usersService.requestUsers(true);
        this.planetMessageService.showMessage($localize`${user.name} ${isDemotion ? 'demoted from' : 'promoted to'} ${type}`);
      },
      () => this.planetMessageService.showAlert($localize`There was an error ${isDemotion ? 'demoting' : 'promoting'} user`)
    );
  }

  setRoles(user, roles, event) {
    event.stopPropagation();
    this.usersService.setRoles(user, roles).subscribe(() => {
      this.usersService.requestUsers(true);
      this.planetMessageService.showMessage($localize`${user.name} roles modified`);
    });
  }

  onPageChange(e: PageEvent) {
    console.log(e);
  }

}
