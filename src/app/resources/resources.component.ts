import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy, ViewEncapsulation, HostBinding, Input } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil, map, switchMap, startWith, skip } from 'rxjs/operators';
import { Subject, of, combineLatest } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import {
  filterSpecificFields, composeFilterFunctions, filterTags, filterAdvancedSearch, filterShelf,
  createDeleteArray, filterSpecificFieldsByWord, commonSortingDataAccessor, selectedOutOfFilter, trackById
} from '../shared/table-helpers';
import { ResourcesService } from './resources.service';
import { environment } from '../../environments/environment';
import { debug } from '../debug-operator';
import { SyncService } from '../shared/sync.service';
import { FormControl } from '../../../node_modules/@angular/forms';
import { PlanetTagInputComponent } from '../shared/forms/planet-tag-input.component';
import { DialogsListService } from '../shared/dialogs/dialogs-list.service';
import { DialogsListComponent } from '../shared/dialogs/dialogs-list.component';
import { findByIdInArray } from '../shared/utils';
import { StateService } from '../shared/state.service';
import { DialogsLoadingService } from '../shared/dialogs/dialogs-loading.service';
import { ResourcesSearchComponent } from './search-resources/resources-search.component';
import { SearchService } from '../shared/forms/search.service';

@Component({
  selector: 'planet-resources',
  templateUrl: './resources.component.html',
  styleUrls: [ './resources.scss' ],
  encapsulation: ViewEncapsulation.None
})
export class ResourcesComponent implements OnInit, AfterViewInit, OnDestroy {
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
  emptyData = false;
  selectedNotAdded = 0;
  selectedAdded = 0;
  selectedSync = [];
  isAuthorized = false;
  showFilters = 'off';
  searchSelection: any = { _empty: true };
  filterPredicate = composeFilterFunctions(
    [
      filterAdvancedSearch(this.searchSelection),
      filterTags(this.tagFilter),
      filterSpecificFieldsByWord([ 'doc.title' ]),
      filterShelf({ value: this.myView === 'myLibrary' ? 'on' : 'off' }, 'libraryInfo')
    ]
  );
  trackById = trackById;
  initialSort = '';

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
    private searchService: SearchService
  ) {
    this.dialogsLoadingService.start();
  }

  ngOnInit() {
    if (this.myView !== 'myPersonals') {
      this.displayedColumns = [ 'select', ...this.displayedColumns, 'rating' ];
    }
    this.titleSearch = '';
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
      this.emptyData = !this.resources.data.length;
      this.resources.paginator = this.paginator;
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
    const itemsShown = Math.min(this.paginator.length - (this.paginator.pageIndex * this.paginator.pageSize), this.paginator.pageSize);
    return this.selection.selected.length === itemsShown;
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
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
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
        this.planetMessageService.showMessage('You have deleted resource: ' + resource.doc.title);
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this resource.')
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
        this.planetMessageService.showMessage('You have deleted ' + deleteArray.length + ' resources');
      },
      onError: (error) => this.planetMessageService.showAlert('There was a problem deleting this resource.')
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
      this.planetMessageService.showMessage(resources.length + ' ' + this.dbName + ' ' + 'queued to ' + msg);
    }, () => error => this.planetMessageService.showMessage(error));
  }

  addTagsToSelected({ selected, indeterminate }) {
    this.resourcesService.updateResourceTags(this.selection.selected, selected, indeterminate).subscribe(() => {
      this.planetMessageService.showMessage('Collections updated');
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
    this.tagInputComponent.addTag(tag);
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
        this.planetMessageService.showMessage(`Resources queued to push to ${childType}.`);
        this.dialogRef.close();
      }, () => this.planetMessageService.showAlert('There was an error sending these resources'));
    };
  }

  onSelectionChange(selected) {
    const { inShelf, notInShelf } = this.userService.countInShelf(selected, 'resourceIds');
    this.selectedAdded = inShelf;
    this.selectedNotAdded = notInShelf;
    this.selectedSync = selected.filter(id => this.hasAttachment(id));
  }

  toggleFilters() {
    this.showFilters = this.showFilters === 'off' ? 'on' : 'off';
  }

  hasAttachment(id: string) {
    return this.resources.data.find((resource: any) => resource._id === id && resource.doc._attachments);
  }

}
