import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, PageEvent, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { takeUntil, map, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { filterSpecificFields, composeFilterFunctions, filterTags, sortNumberOrString } from '../shared/table-helpers';
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
import { DialogsLoadingComponent } from '../shared/dialogs/dialogs-loading.component';

@Component({
  templateUrl: './resources.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-tags {
      max-width: 125px;
    }
    .mat-column-rating {
      max-width: 225px;
    }
    .mat-progress-bar {
      height: 10px;
      width: 120px;
    }
  ` ]
})
export class ResourcesComponent implements OnInit, AfterViewInit, OnDestroy {
  resources = new MatTableDataSource();
  pageEvent: PageEvent;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  dialogRef: MatDialogRef<DialogsListComponent>;
  readonly dbName = 'resources';
  message = '';
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  onDestroy$ = new Subject<void>();
  parent = this.route.snapshot.data.parent;
  planetConfiguration = this.stateService.configuration;
  planetType = this.planetConfiguration.planetType;
  displayedColumns = [ 'select', 'title', 'rating' ];
  getOpts = this.parent ? { domain: this.planetConfiguration.parentDomain } : {};
  currentUser = this.userService.get();
  tagFilter = new FormControl([]);
  tagFilterValue = [];
  // As of v0.1.13 ResourcesComponent does not have download link available on parent view
  urlPrefix = environment.couchAddress + '/' + this.dbName + '/';
  private _titleSearch = '';
  get titleSearch(): string { return this._titleSearch; }
  set titleSearch(value: string) {
    // When setting the titleSearch, also set the resource filter
    this.resources.filter = value ? value : this.dropdownsFill();
    this._titleSearch = value;
  }
  emptyData = false;
  selectedNotAdded = 0;
  selectedAdded = 0;
  spinnerDialog: MatDialogRef<DialogsLoadingComponent>;

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
    private stateService: StateService
  ) {}

  ngOnInit() {
    this.spinnerDialog = this.dialog.open(DialogsLoadingComponent, {
      disableClose: true
    });
    this.resourcesService.resourcesListener(this.parent).pipe(
      takeUntil(this.onDestroy$),
      map((resources) => {
        // Sort in descending createdDate order, so the new resource can be shown on the top
        resources.sort((a, b) => b.createdDate - a.createdDate);
        return this.setupList(resources, this.userService.shelf.resourceIds);
      }),
      switchMap((resources) => this.parent ? this.couchService.localComparison(this.dbName, resources) : of(resources))
    ).subscribe((resources) => {
      this.resources.data = resources;
      this.emptyData = !this.resources.data.length;
      this.resources.paginator = this.paginator;
      this.closeSpinner();
    });
    this.resourcesService.requestResourcesUpdate(this.parent);
    this.resources.filterPredicate = composeFilterFunctions(
      [ filterTags('tags', this.tagFilter), filterSpecificFields([ 'title' ]) ]
    );
    this.resources.sortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'rating':
          return item.rating.rateSum / item.rating.totalRating || 0;
        default:
          return sortNumberOrString(item, property);
      }
    };
    this.stateService.requestData('tags', this.parent ? 'parent' : 'local');
    this.userService.shelfChange$.pipe(takeUntil(this.onDestroy$))
      .subscribe((shelf: any) => {
        this.resources.data = this.setupList(this.resources.data, shelf.resourceIds);
      });
    this.tagFilter.valueChanges.subscribe((tags) => {
      this.tagFilterValue = tags;
      this.resources.filter = this.resources.filter || ' ';
    });
    this.selection.onChange.subscribe(({ source }) => {
      this.countSelectedNotAdded(source.selected);
    });
  }

  setupList(resourcesRes, myLibrarys) {
    return resourcesRes.map((resource: any) => {
      const myLibraryIndex = myLibrarys.findIndex(resourceId => {
        return resource._id === resourceId;
      });
      return { ...resource, libraryInfo: myLibraryIndex > -1 };
    });
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  ngAfterViewInit() {
    this.resources.sort = this.sort;
    this.resources.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
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
    this.openDeleteDialog(this.deleteResource(resource), 'single', resource.title, 1);
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
      displayName = resource.title;
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
    return () => {
      const { _id: resourceId, _rev: resourceRev } = resource;
      this.couchService.delete(this.dbName + '/' + resourceId + '?rev=' + resourceRev)
        .subscribe((data) => {
          this.selection.deselect(resourceId);
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted resource: ' + resource.title);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  deleteResources(resources) {
    return () => {
      const deleteArray = resources.map((resource) => {
        return { _id: resource._id, _rev: resource._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray })
        .subscribe((data) => {
          this.resourcesService.requestResourcesUpdate(this.parent);
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted ' + deleteArray.length + ' resources');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  goBack() {
    this.parent ? this.router.navigate([ '/manager' ]) : this.router.navigate([ '/' ]);
  }

  libraryToggle(resourceIds, type) {
    this.resourcesService.libraryAddRemove(resourceIds, type).subscribe((res) => {
      this.countSelectedNotAdded(this.selection.selected);
    }, (error) => ((error)));
  }

  shareResource(type, resources) {
    const msg = (type === 'pull' ? 'fetch' : 'send'),
      items = resources.map(id => ({ item: this.resources.data.find((resource: any) => resource._id === id), db: this.dbName }));
    this.syncService.confirmPasswordAndRunReplicators(this.syncService.createRepicatorsArray(items, type) )
    .subscribe((response: any) => {
      this.planetMessageService.showMessage(resources.length + ' ' + this.dbName + ' ' + 'queued to ' + msg);
    }, () => error => this.planetMessageService.showMessage(error));
  }

  onTagsChange(newTags) {
    this.tagFilterValue = newTags;
  }

  resetFilter() {
    this.tagFilter.setValue([]);
    this.tagFilterValue = [];
    this.titleSearch = '';
  }

  // Returns a space to fill the MatTable filter field so filtering runs for dropdowns when
  // search text is deleted, but does not run when there are no active filters.
  dropdownsFill() {
    return this.tagFilter.value.length > 0 ? ' ' : '';
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
        allowMulti: false,
        ...planet };
      this.dialogRef = this.dialog.open(DialogsListComponent, {
        data, height: '500px', width: '600px', autoFocus: false
      });
    });
  }

  sendResource() {
    return (selectedPlanet: any) => {
      const items = this.selection.selected.map(id => findByIdInArray(this.resources.data, id));
      this.syncService.createChildPullDoc(items, 'resources', selectedPlanet[0].code).subscribe(() => {
        this.planetMessageService.showMessage('Resources queued to push to child.');
        this.dialogRef.close();
      }, () => this.planetMessageService.showAlert('There was an error sending these resources'));
    };
  }

  countSelectedNotAdded(selected: any) {
    const { inShelf, notInShelf } = this.userService.countInShelf(selected, 'resourceIds');
    this.selectedAdded = inShelf;
    this.selectedNotAdded = notInShelf;
  }

  closeSpinner() {
    for (const entry of this.dialog.openDialogs) {
      if (entry === this.spinnerDialog) {
        this.spinnerDialog.close();
      }
    }
  }

}
