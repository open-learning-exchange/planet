import { Component, OnInit, OnDestroy, ViewChild, Input, HostListener } from '@angular/core';
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
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  selector: 'planet-users',
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
  @Input() isDialog = false;
  @Input() hideChildren = false;
  @Input() excludeIds = [];
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
  private searchChange = new Subject<string>();
  configuration = this.stateService.configuration;
  tableState = new TableState();
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  showFiltersRow = false;
  isLoading = true;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private managerService: ManagerService,
    private usersService: UsersService,
    private deviceInfoService: DeviceInfoService
  ) {
    this.dialogsLoadingService.start();
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
  }

  ngOnInit() {
    this.isLoading = true;
    this.planetType = this.stateService.configuration.planetType;
    this.isUserAdmin = this.userService.get().isUserAdmin;
    this.route.paramMap.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((params: ParamMap) => {
      this.applyFilter(params.get('search'));
    });
    this.managerService.getChildPlanets(true).pipe(map(
      (state) => attachNamesToPlanets(state)
    )).subscribe(childPlanets =>
      this.children = childPlanets.filter((planet: any) => planet.doc.docType !== 'parentName').sort(sortPlanet)
    );
    this.usersService.usersListener().pipe(takeUntil(this.onDestroy$)).subscribe(users => {
      this.dialogsLoadingService.stop();
      this.users = users.filter((user: any) => this.excludeIds.indexOf(user._id) === -1);
      this.isLoading = false;
    });
    this.searchChange.pipe(debounceTime(500), takeUntil(this.onDestroy$)).subscribe((searchText) => {
      if (this.isDialog) {
        this.applyFilter(searchText);
      } else {
        this.router.navigate([ '..', searchText ? { search: searchText } : {} ], { relativeTo: this.route });
      }
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
    this.changePlanetFilter(this.tableState.filterType, this.tableState.selectedChild || {});
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
    this.usersService.setRolesForUsers(this.usersTable.selection.selected, roles).subscribe(
      () => {
        this.usersService.requestUsers(true);
        this.planetMessageService.showMessage($localize`Roles updated`);
      },
      () => this.planetMessageService.showAlert($localize`There was an error adding role(s) to member(s)`)
    );
  }

  back() {
    this.router.navigate([ '../' ], { relativeTo: this.route });
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
    this.searchChange.next('');
  }
}
