import { Component, OnInit, OnDestroy, ViewChild, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { takeUntil, debounceTime, map, finalize } from 'rxjs/operators';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatButtonToggleGroup, MatButtonToggle } from '@angular/material/button-toggle';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import { Validators } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';

import { UserService } from '@shared/auth/user.service';
import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { StateService } from '@shared/state.service';
import { DialogsLoadingService } from '@shared/dialogs/dialogs-loading.service';
import { DialogsFormService } from '@shared/dialogs/dialogs-form.service';
import { PlanetRoleComponent } from '@shared/auth/planet-role.component';
import { ListToolbarComponent, ActiveFilter } from '@shared/tables/list-toolbar.component';
import { ListActionsComponent } from '@shared/tables/list-actions.component';

import { ManagerService } from '../manager-dashboard/manager.service';
import { UsersService } from './users.service';
import { TableState, UsersTableComponent } from './users-table.component';
import { attachNamesToPlanets, sortPlanet } from '../manager-dashboard/reports/reports.utils';

const roleLabels = {
  leader: $localize`Leader`,
  monitor: $localize`Monitor`,
  health: $localize`Health Provider`,
  learner: $localize`Learner`,
  manager: $localize`Manager`,
  admin: $localize`Admin`
};

@Component({
  selector: 'planet-users',
  templateUrl: './users.component.html',
  imports: [
    ListToolbarComponent,
    ListActionsComponent,
    MatIconButton,
    MatIcon,
    NgTemplateOutlet,
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
  filteredRole: string;
  userShelf = this.userService.shelf;
  private onDestroy$ = new Subject<void>();
  private searchChange = new Subject<string>();
  configuration = this.stateService.configuration;
  tableState = new TableState();
  activeFilters: ActiveFilter[] = [];
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
    private dialogsFormService: DialogsFormService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    this.isLoading = true;
    this.planetType = this.stateService.configuration.planetType;
    this.isUserAdmin = this.userService.get().isUserAdmin;
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
    this.setActiveFilters();
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
    this.dialogsLoadingService.start();
    this.usersService.setRolesForUsers(this.usersTable.selection.selected, roles).pipe(
      finalize(() => this.dialogsLoadingService.stop())
    ).subscribe(
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

  onFilterChange(filterValue: string) {
    this.filter = { ...this.filter, 'doc.roles': filterValue === 'All' ? '' : filterValue };
    this.changePlanetFilter(this.tableState.filterType, this.tableState.selectedChild);
  }

  resetFilter() {
    this.filteredRole = 'All';
    this.filter = { ...this.filter, 'doc.roles': '' };
    this.setActiveFilters();
    this.searchChange.next('');
  }

  openRolesDialog() {
    this.dialogsFormService.confirm(
      $localize`Set roles of selected`,
      [ {
        type: 'selectbox', name: 'roles', placeholder: $localize`Roles`, multiple: true, required: true,
        options: this.roleList.map(role => ({ name: roleLabels[role], value: role }))
      } ],
      { roles: [ [], Validators.required ] }
    ).subscribe((response: any) => {
      if (response) {
        this.roleSubmit(response.roles);
      }
    });
  }

  private setActiveFilters() {
    const { filterType, selectedChild } = this.tableState;
    const child = this.children?.find(({ doc }) => doc === selectedChild);
    const role = this.filter['doc.roles'];
    this.activeFilters = [
      ...(filterType === 'associated' ? [ { label: $localize`Associated`, clear: () => this.changePlanetFilter('local') } ] : []),
      ...(child ? [ { label: child.nameDoc ? child.nameDoc.name : child.doc.name, clear: () => this.changePlanetFilter('local') } ] : []),
      ...(role ? [ { label: roleLabels[role], clear: () => this.resetRole() } ] : [])
    ];
  }

  private resetRole() {
    this.filteredRole = 'All';
    this.onFilterChange('All');
  }
}
