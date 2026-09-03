import { Component, OnInit, OnDestroy, ViewChild, Input } from '@angular/core';
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
import { optionalUserColumns } from './user-constants';
import { ConfigurationService } from '../configuration/configuration.service';
import { attachNamesToPlanets, sortPlanet } from '../manager-dashboard/reports/reports.utils';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { PlanetRoleComponent } from '../shared/planet-role.component';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'planet-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  imports: [
    MatToolbar,
    MatIconButton,
    MatIcon,
    NgTemplateOutlet,
    MatToolbarRow,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatFormField,
    MatSuffix,
    MatLabel,
    MatSelect,
    MatOption,
    PlanetRoleComponent,
    MatInput,
    MatButton,
    MatTooltip,
    FormsModule,
    UsersTableComponent
  ]
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
  optionalUserColumns = optionalUserColumns;
  extraColumns: string[] = [];
  private savedExtraColumns: string[] = [];
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
    private deviceInfoService: DeviceInfoService,
    private configurationService: ConfigurationService
  ) {
    this.dialogsLoadingService.start();
    this.deviceInfoService.watchDeviceType().pipe(takeUntil(this.onDestroy$)).subscribe((deviceType) => {
      this.deviceType = deviceType;
    });
  }

  ngOnInit() {
    this.isLoading = true;
    this.planetType = this.stateService.configuration.planetType;
    this.isUserAdmin = this.userService.get().isUserAdmin;
    this.setExtraColumns(this.stateService.configuration.userTableColumns);
    this.route.queryParamMap.pipe(
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
        this.router.navigate([], { relativeTo: this.route, queryParams: { search: searchText || null }});
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
      this.displayedColumns = [ 'profile', 'name', ...this.extraColumns, 'visitCount', 'joinDate', 'lastLogin', 'roles', 'action' ];
      if (this.isUserAdmin) {
        this.displayedColumns.unshift('select');
      }
    } else {
      this.displayedColumns = [ 'profile', 'name', 'joinDate', 'lastLogin', 'action' ];
    }
  }

  // Unknown values are dropped so a stale configuration cannot ask the table for a column it has no definition for
  private setExtraColumns(columns: any) {
    const optionalColumns = this.optionalUserColumns.map(({ value }) => value);
    this.extraColumns = Array.isArray(columns) ? columns.filter((column: any) => optionalColumns.indexOf(column) > -1) : [];
    this.savedExtraColumns = this.extraColumns;
    this.filterDisplayColumns(this.tableState.filterType);
  }

  extraColumnsChanged(columns: string[]) {
    this.extraColumns = columns;
    this.filterDisplayColumns(this.tableState.filterType);
  }

  // Saved when the dropdown closes so choosing several columns is one write rather than one per column
  saveExtraColumns() {
    if (this.extraColumns.join(',') === this.savedExtraColumns.join(',')) {
      return;
    }
    const userTableColumns = [ ...this.extraColumns ];
    this.configurationService.patchLocalConfiguration({ userTableColumns }).subscribe(
      () => {
        this.savedExtraColumns = userTableColumns;
        this.stateService.requestData('configurations', 'local');
        this.planetMessageService.showMessage($localize`Member table columns updated`);
      },
      () => this.planetMessageService.showAlert($localize`There was an error updating the member table columns`)
    );
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
