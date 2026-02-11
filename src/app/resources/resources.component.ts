import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, ViewEncapsulation, HostBinding, Input, HostListener } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { MatLegacyDialog as MatDialog, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil, map, switchMap, startWith, skip } from 'rxjs/operators';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component'; import { Subject, of, combineLatest } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { FuzzySearchService } from '../shared/fuzzy-search.service';
import {
  filterSpecificFields, composeFilterFunctions, filterTags, filterAdvancedSearch, filterShelf,
  createDeleteArray, commonSortingDataAccessor, filterSpecificFieldsHybrid, selectedOutOfFilter, trackById
} from '../shared/table-helpers';
import { ResourcesService } from './resources.service';
import { environment } from '../../environments/environment';
import { SyncService } from '../shared/sync.service';
import { FormControl } from '../../../node_modules/@angular/forms';
import { PlanetTagInputComponent } from '../shared/forms/planet-tag-input.component';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { findByIdInArray, calculateMdAdjustedLimit, itemsShown } from '../shared/utils';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ResourcesSearchComponent } from './search-resources/resources-search.component';
import { SearchService } from '../shared/forms/search.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';

@Component({
  selector: 'planet-resources',
  templateUrl: './resources.component.html',
  styleUrls: [ './resources.scss' ],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class ResourcesComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  resources = new MatTableDataSource();
  pageEvent: PageEvent;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(ResourcesSearchComponent) searchComponent: ResourcesSearchComponent;
  @HostBinding('class') readonly hostClass = 'resources-list';
  @Input() isDialog = false;
  @Input() excludeIds = [];
  dialogRef: MatDialogRef<DialogsListComponent>;
  readonly dbName = 'resources';
  message = '';
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  onDestroy$ = new Subject<void>();
  parent = this.route.snapshot.data.parent;
  planetConfiguration = this.stateService.configuration;
  planetType = this.planetConfiguration.planetType;
  displayedColumns = [ 'title', 'createdDate' ];
  getOpts = this.parent ? { domain: this.planetConfiguration.parentDomain } : {};
  currentUser = this.userService.get();
  tagFilter = new FormControl([]);
  tagFilterValue = [];
  // As of v0.1.13 ResourcesComponent does not have download link available on parent view
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch.trim(); }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the resource filter
    this.resources.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
    this.recordSearch();
    this.removeFilteredFromSelection();
  }
  myView = this.route.snapshot.data.view;
  selectedNotAdded = 0;
  selectedAdded = 0;
  selectedSync = [];
  isAuthorized = false;
  showFilters = false;
  searchSelection: any = { _empty: true };
  filterPredicate = composeFilterFunctions(
    [
      filterAdvancedSearch(this.searchSelection),
      filterTags(this.tagFilter),
      filterSpecificFieldsHybrid([ 'doc.title' ], this.fuzzySearchService),
      filterShelf({ value: this.myView === 'myLibrary' ? 'on' : 'off' }, 'libraryInfo')
    ]
  );
  trackById = trackById;
  initialSort = '';
  deviceType: DeviceType;
  deviceTypes: typeof DeviceType = DeviceType;
  isTablet: boolean;
  showFiltersRow = false;
  expandedElement: any = null;
  previewLimit = 450;

  @ViewChild(PlanetTagInputComponent)
  private tagInputComponent: PlanetTagInputComponent;

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private resourcesService: ResourcesService,
    private syncService: SyncService,
    private dialogsListService: DialogsListService,
    private stateService: StateService,
    private dialogsLoadingService: DialogsLoadingService,
    private searchService: SearchService,
    private deviceInfoService: DeviceInfoService,
    private fuzzySearchService: FuzzySearchService
  ) {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isTablet = window.innerWidth <= 1040;
  }

  @HostListener('window:resize') OnResize() {
    this.deviceType = this.deviceInfoService.getDeviceType();
    this.isTablet = window.innerWidth <= 1040;
  }

  ngOnInit() {
    if (this.myView !== 'myPersonals') {
      this.displayedColumns = [ 'select', 'title', 'info', 'createdDate', 'rating' ];
    }
    this.titleSearch = '';
    this.dialogsLoadingService.start();
    combineLatest(this.resourcesService.resourcesListener(this.parent), this.userService.shelfChange$).pipe(
      startWith([ [], null ]), skip(1), takeUntil(this.onDestroy$),
      map(([ resources, shelf ]) => this.setupList(resources, (shelf || this.userService.shelf).resourceIds)),
      switchMap((resources) => this.parent ? this.couchService.localComparison(this.dbName, resources) : of(resources))
    ).subscribe((resources) => {
      this.resources.data = resources.filter(
        (resource: any) =>
          this.excludeIds.indexOf(resource._id) === -1 &&
          (this.myView === 'myPersonals' ?
            (resource.doc.private === true && (resource.doc.privateFor || {}).users === this.userService.get()._id) :
            resource.doc.private !== true)
      );
      this.resources.paginator = this.paginator;
      this.isLoading = false;
      this.dialogsLoadingService.stop();
    }, () => {
      this.isLoading = false;
      this.dialogsLoadingService.stop();
    });
    this.resourcesService.requestResourcesUpdate(this.parent);
    this.resources.filterPredicate = this.filterPredicate;
    this.resources.sortingDataAccessor = commonSortingDataAccessor;
    this.tagFilter.valueChanges.subscribe((tags) => {
      this.tagFilterValue = tags;
      this.titleSearch = this.titleSearch;
      this.removeFilteredFromSelection();
    });
    this.selection.changed.subscribe(({ source }) => this.onSelectionChange(source.selected));
    this.couchService.checkAuthorization('resources').subscribe((isAuthorized) => this.isAuthorized = isAuthorized);
    this.initialSort = this.route.snapshot.paramMap.get('sort');
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

  removeFilteredFromSelection() {
    this.selection.deselect(...selectedOutOfFilter(this.resources.filteredData, this.selection, this.paginator));
  }


  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  ngAfterViewInit() {
    this.resources.sort = this.sort;
    this.resources.paginator = this.paginator;
    if (this.tagInputComponent) {
      this.tagInputComponent.addTags(this.route.snapshot.paramMap.get('collections'));
    }
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
    this.recordSearch(true);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    return this.selection.selected.length === itemsShown(this.paginator);
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    const start = this.paginator.pageIndex * this.paginator.pageSize;
    const end = start + this.paginator.pageSize;
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.filteredData.slice(start, end).forEach((row: any) => this.selection.select(row._id));
  }

  updateResource(resource) {
    const { _id: resourceId } = resource;
    this.router.navigate([ '/resources/update/' + resource._id ]);
  }

  deleteClick(resource) {
    this.openDeleteDialog(this.deleteResource(resource), 'single', resource.doc.title, 1);
  }

  deleteSelected() {
    const resources = this.selection.selected.map(id => this.resources.data.find((r: any) => r._id === id));
    let amount = 'many',
      okClick = this.deleteResources(resources),
      displayName = '';
    if (resources.length === 1) {
      const resource: any = resources[0];
      amount = 'single';
      okClick = this.deleteResource(resource);
      displayName = resource.doc.title;
    }
    this.openDeleteDialog(okClick, amount, displayName, resources.length);
  }

  openDeleteDialog(okClick, amount, displayName = '', count) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'resource',
        displayName,
        count
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().subscribe(() => {
      this.message = '';
    });
  }

  deleteResource(resource) {
    const { _id: resourceId, _rev: resourceRev } = resource;
    return {
      request: this.couchService.delete(this.dbName + '/' + resourceId + '?rev=' + resourceRev),
      onNext: (data) => {
        this.selection.deselect(resourceId);
        this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted resource: ${resource.doc.title}`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this resource.`)
    };
  }

  deleteResources(resources) {
    const deleteArray = createDeleteArray(resources);
    return {
      request: this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray }),
      onNext: (data) => {
        this.resourcesService.requestResourcesUpdate(this.parent);
        this.selection.clear();
        this.deleteDialog.close();
        this.planetMessageService.showMessage($localize`You have deleted ${deleteArray.length} resources`);
      },
      onError: (error) => this.planetMessageService.showAlert($localize`There was a problem deleting this resource.`)
    };
  }

  goBack() {
    this.router.navigate([ '..' ], { relativeTo: this.route.parent });
  }

  libraryToggle(resourceIds, type) {
    this.resourcesService.libraryAddRemove(resourceIds, type).subscribe((res) => {
      this.removeFilteredFromSelection();
      this.onSelectionChange(this.selection.selected);
    }, (error) => ((error)));
  }

  shareResource(type, resources) {
    const msg = (type === 'pull' ? 'fetch' : 'send'),
      items = resources.map(id => ({ item: this.resources.data.find((resource: any) => resource._id === id), db: this.dbName }));
    this.syncService.confirmPasswordAndRunReplicators(this.syncService.createReplicatorsArray(items, type) )
    .subscribe((response: any) => {
      this.planetMessageService.showMessage($localize`${resources.length} ${this.dbName} queued to ${msg}`);
    }, () => error => this.planetMessageService.showMessage(error));
  }

  addTagsToSelected({ selected, indeterminate }) {
    this.resourcesService.updateResourceTags(this.selection.selected, selected, indeterminate).subscribe(() => {
      this.planetMessageService.showMessage($localize`Collections updated`);
    });
  }

  onSearchChange({ items, category }) {
    this.searchSelection[category] = items;
    this.searchSelection._empty = Object.entries(this.searchSelection).every(
      ([ field, val ]: any[]) => !Array.isArray(val) || val.length === 0
    );
    this.titleSearch = this.titleSearch;
    this.removeFilteredFromSelection();
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

  recordSearch(complete = false) {
    if (this.resources.filter !== '') {
      this.searchService.recordSearch({
        text: this._titleSearch,
        type: this.dbName,
        filter: { ...this.searchSelection, tags: this.tagFilter.value }
      }, complete);
    }
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return this.tagFilter.value.length > 0 ||
      Object.entries(this.searchSelection).findIndex(([ field, val ]: any[]) => val.length > 0) > -1 ||
      this.myView !== undefined ?
      ' ' : '';
  }

  addTag(tag: string) {
    if (tag.trim()) {
      this.tagInputComponent.writeValue([ tag ]);
    }
  }

  openSendResourceDialog() {
    this.dialogsListService.getListAndColumns('communityregistrationrequests', { 'registrationRequest': 'accepted' })
    .pipe(takeUntil(this.onDestroy$))
    .subscribe((planet) => {
      const data = { okClick: this.sendResource().bind(this),
        filterPredicate: filterSpecificFields([ 'name' ]),
        allowMulti: true,
        ...planet };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data, maxHeight: '500px', width: '600px', autoFocus: false
      });
    });
  }

  sendResource() {
    return (selectedPlanets: any) => {
      const items = this.selection.selected.map(id => findByIdInArray(this.resources.data, id));
      this.syncService.createChildPullDoc(items, 'resources', selectedPlanets).subscribe(() => {
        const childType = {
          center: selectedPlanets.length > 1 ? 'nations' : 'nation',
          nation: selectedPlanets.length > 1 ? 'communities' : 'community'
        }[this.planetType];
        this.planetMessageService.showMessage($localize`Resources queued to push to ${childType}.`);
        this.dialogRef.close();
      }, () => this.planetMessageService.showAlert($localize`There was an error sending these resources`));
    };
  }

  onSelectionChange(selected) {
    const { inShelf, notInShelf } = this.userService.countInShelf(selected, 'resourceIds');
    this.selectedAdded = inShelf;
    this.selectedNotAdded = notInShelf;
    this.selectedSync = selected.filter(id => this.hasAttachment(id));
  }

  hasAttachment(id: string) {
    return this.resources.data.find((resource: any) => resource._id === id && resource.doc._attachments);
  }

  toggleRow(element: any) {
    this.expandedElement = this.expandedElement === element ? null : element;
  }

  onExpansionDone(event: any, element: any) {
    element.renderContent = (event.toState === 'expanded');
  }

  isExpanded(element: any): boolean {
    return this.expandedElement === element;
  }

  formatLevels(levels: string | string[] = []): string {
    const arr = Array.isArray(levels) ? levels : String(levels).split(',');
    return arr.map(s => s.trim()).filter(Boolean).join(', ');
  }

  showPreviewExpand(element: any): boolean {
    if (!element.description) { return false; }
    return element.description.length > calculateMdAdjustedLimit(element.description, this.previewLimit);
  }

}
