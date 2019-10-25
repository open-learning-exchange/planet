import { Component, OnInit, ViewChild, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
// import { FormControl } from '../../../node_modules/@angular/forms';
import { FormControl, } from '@angular/forms';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, PageEvent, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
// import { selectedOutOfFilter } from '../shared/table-helpers';
import { filterSpecificFields, composeFilterFunctions, filterTags, filterAdvancedSearch, filterShelf,
  createDeleteArray, filterSpecificFieldsByWord, commonSortingDataAccessor, selectedOutOfFilter, trackById 
} from '../../shared/table-helpers';
import { ResourcesSearchComponent } from '../../resources/search-resources/resources-search.component';
import { Subject, of, combineLatest } from 'rxjs';
import { ResourcesService } from '../../resources/resources.service';
import { UserService } from '../../shared/user.service';
import { takeUntil, map, switchMap, startWith, skip } from 'rxjs/operators';
import { CouchService } from '../../shared/couchdb.service';
import { StateService } from '../../shared/state.service';
import { DialogsLoadingService } from '../../shared/dialogs/dialogs-loading.service';
import { PlanetTagInputComponent } from '../../shared/forms/planet-tag-input.component';
import { UsersPersonalsService } from './users-personals.service';

@Component({
  selector: 'planet-users-personals',
  templateUrl: './users-personals.component.html',
  styleUrls: [ './users-personals.component.scss' ]
})
export class UsersPersonalsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;
  @ViewChild(ResourcesSearchComponent, { static: false }) searchComponent: ResourcesSearchComponent;
  resources = new MatTableDataSource();
  parent = this.route.snapshot.data.parent;
  tagFilter = new FormControl([]);
  readonly dbName = 'resources';
  showFilters = 'off';
  readonly myLibraryFilter: { value: 'on' | 'off' } = { value: this.route.snapshot.data.myLibrary === true ? 'on' : 'off' };
  searchSelection: any = { _empty: true };

  tagFilterValue = [];
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the resource filter
    this.resources.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
    this.removeFilteredFromSelection();
  }
  selection = new SelectionModel(true, []);
  trackById = trackById;
  onDestroy$ = new Subject<void>();
  emptyData = false;
  @Input() excludeIds = [];
  filterPredicate = composeFilterFunctions(
    [
      filterAdvancedSearch(this.searchSelection),
      filterTags(this.tagFilter),
      filterSpecificFieldsByWord([ 'doc.title' ]),
      filterShelf(this.myLibraryFilter, 'libraryInfo')
    ]
  );
  isAuthorized = false;
  selectedNotAdded = 0;
  selectedAdded = 0;
  selectedSync = [];
  currentUser = this.userService.get();
  planetConfiguration = this.stateService.configuration;
  @ViewChild(MatSort, { static: false }) sort: MatSort;

  @ViewChild(PlanetTagInputComponent, { static: false })
  private tagInputComponent: PlanetTagInputComponent;
  displayedColumns = [ 'select', 'title' ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private resourcesService: ResourcesService,
    private userService: UserService,
    private couchService: CouchService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private usersPersonalsService: UsersPersonalsService
  ) {}

  ngOnInit() {
    this.titleSearch = this.dropdownsFill();
    combineLatest(this.usersPersonalsService.resourcesListener(this.parent), this.userService.shelfChange$).pipe(
      startWith([ [], null ]), skip(1), takeUntil(this.onDestroy$),
      map(([ resources, shelf ]) => this.setupList(resources, (shelf || this.userService.shelf).resourceIds)),
      switchMap((resources) => this.parent ? this.couchService.localComparison(this.dbName, resources) : of(resources))
    ).subscribe((resources) => {
      this.resources.data = resources.filter(
        (resource: any) => this.excludeIds.indexOf(resource._id) === -1 && resource.doc.private === true
      );
      this.emptyData = !this.resources.data.length;
      this.resources.paginator = this.paginator;
      this.dialogsLoadingService.stop();
    });
    this.usersPersonalsService.requestResourcesUpdate(this.parent);
    this.resources.filterPredicate = this.filterPredicate;
    this.resources.sortingDataAccessor = commonSortingDataAccessor;
    this.tagFilter.valueChanges.subscribe((tags) => {
      this.tagFilterValue = tags;
      this.resources.filter = this.resources.filter || tags.length > 0 ? ' ' : '';
      this.removeFilteredFromSelection();
    });
    this.selection.onChange.subscribe(({ source }) => this.onSelectionChange(source.selected));
    this.couchService.checkAuthorization('resources').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    console.log(this.resources.data);
    // this.getPersonals();
  }

  ngAfterViewInit() {
    this.resources.sort = this.sort;
    this.resources.paginator = this.paginator;
    this.tagInputComponent.addTags(this.route.snapshot.paramMap.get('collections'));
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onSelectionChange(selected) {
    const { inShelf, notInShelf } = this.userService.countInShelf(selected, 'resourceIds');
    this.selectedAdded = inShelf;
    this.selectedNotAdded = notInShelf;
    this.selectedSync = selected.filter(id => this.hasAttachment(id));
  }

  // getPersonals() {
  //   this.usersPersonalsService.getPersonals().subscribe(
  //     (resources: any) => {
  //       console.log(resources);
  //       this.resources.data = resources;
  //     });
  // }

  hasAttachment(id: string) {
    return this.resources.data.find((resource: any) => resource._id === id && resource.doc._attachments);
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  setupList(resourcesRes, myLibrarys) {
    return resourcesRes.map((resource: any) => {
      const myLibraryIndex = myLibrarys.findIndex(resourceId => {
        return resource._id === resourceId;
      });
      resource.canManage = this.currentUser.isUserAdmin ||
        (resource.doc.addedBy === this.currentUser.name && resource.doc.sourcePlanet === this.planetConfiguration.code);
      return { ...resource, libraryInfo: myLibraryIndex > -1 };
    });
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  toggleFilters() {
    this.showFilters = this.showFilters === 'off' ? 'on' : 'off';
  }

  onSearchChange({ items, category }) {
    this.searchSelection[category] = items;
    this.searchSelection._empty = Object.entries(this.searchSelection).every(([ field, val ]: any[]) => val.length === 0);
    this.titleSearch = this.titleSearch;
    this.removeFilteredFromSelection();
  }

  removeFilteredFromSelection() {
    this.selection.deselect(...selectedOutOfFilter(this.resources.filteredData, this.selection, this.paginator));
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return this.tagFilter.value.length > 0 ||
      Object.entries(this.searchSelection).findIndex(([ field, val ]: any[]) => val.length > 0) > -1 ||
      this.myLibraryFilter.value === 'on' ?
      ' ' : '';
  }

  resetFilter() {
    this.tagFilter.setValue([]);
    this.tagFilterValue = [];
    Object.keys(this.searchSelection).forEach(key => this.searchSelection[key] = []);
    if (this.searchComponent) {
      this.searchComponent.reset();
    }
    this.titleSearch = '';
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
  }

}
