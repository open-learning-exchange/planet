import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { MatTableDataSource, MatPaginator, MatSort, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router } from '@angular/router';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { PlanetMessageService } from '../shared/planet-message.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { environment } from '../../environments/environment';
import { UserService } from '../shared/user.service';
import { forkJoin } from 'rxjs/observable/forkJoin';

@Component({
  templateUrl: './resources.component.html',
  styles: [ `
    /* Column Widths */
    .mat-column-select {
      max-width: 44px;
    }
    .mat-column-rating {
      max-width: 225px;
    }
  ` ]
})
export class ResourcesComponent implements OnInit, AfterViewInit {
  resources = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns = [ 'select', 'info', 'rating' ];
  readonly dbName = 'resources';
  mRating;
  fRating;
  message = '';
  file: any;
  deleteDialog: any;
  nationName = '';
  selection = new SelectionModel(true, []);
  urlPrefix = environment.couchAddress + this.dbName + '/';
  user: any = {};

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private httpclient: HttpClient,
    private planetMessageService: PlanetMessageService,
    private userService: UserService
  ) {}

  ngOnInit() {
    forkJoin(this.getResources(), this.getAddedLibrary()).subscribe((results) => {
      this.setupList(results[0].rows, results[1].docs[0].resourceIds);
    }, (error) => console.log(error));
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
    this.resources.filterPredicate = filterSpecificFields([ 'title' ]);
  }

  setupList(resourcesRes, myLibrarys) {
    this.resources.data = resourcesRes.map((r: any) => {
      const resource = r.doc || r;
      const myLibraryIndex = myLibrarys.findIndex(resourceId => {
        return resource._id === resourceId;
      });
      if (myLibraryIndex > -1) {
        return { ...resource, libraryInfo: true };
      }
      return { ...resource,  libraryInfo: false };
    });
  }

  ngAfterViewInit() {
    this.resources.sort = this.sort;
    this.resources.paginator = this.paginator;
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.resources.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.data.forEach(row => this.selection.select(row));
  }

  getRating(sum, timesRated) {
    let rating = 0;
    if (sum > 0 && timesRated > 0) {
      rating = sum / timesRated;
    }
    // Multiply by 20 to convert rating out of 5 to percent for width
    return (rating * 20) + '%';
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  getAddedLibrary() {
    return this.couchService.post('shelf/_find', { 'selector': { 'user': this.userService.get().name } })
    .pipe(catchError(err => {
      // If there's an error, return a fake couchDB empty response
      // so resources can be displayed.
      return of({ docs: [] });
    }));
  }

  getExternalResources() {
    return this.couchService.post('nations/_find',
    { 'selector': { 'name': this.nationName },
    'fields': [ 'name', 'nationurl' ] })
      .pipe(switchMap(data => {
        this.nationName = data.docs[0].name;
        const nationUrl = data.docs[0].nationurl;
        if (nationUrl) {
          return this.httpclient.jsonp('http://' + nationUrl +
            '/resources/_all_docs?include_docs=true&callback=JSONP_CALLBACK',
            'callback'
          );
        }
        // If there is no url, return an observable of an empty array
        return of([]);
      }));
  }

  getResources() {
    this.nationName = this.route.snapshot.paramMap.get('nationname');
    if (this.nationName !== null) {
      return this.getExternalResources();
    } else {
      return this.couchService.get('resources/_all_docs?include_docs=true');
    }
  }

  deleteClick(resource) {
    this.openDeleteDialog(this.deleteResource(resource), 'single', resource.title);
  }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteResources(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      const resource = this.selection.selected[0];
      amount = 'single';
      okClick = this.deleteResource(resource);
      displayName = resource.title;
    }
    this.openDeleteDialog(okClick, amount, displayName);
  }

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'resource',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteResource(resource) {
    return () => {
      const { _id: resourceId, _rev: resourceRev } = resource;
      this.couchService.delete(this.dbName + '/' + resourceId + '?rev=' + resourceRev)
        .subscribe((data) => {
          this.resources.data = this.resources.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted resource: ' + resource.title);
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
          this.getResources();
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showAlert('You have deleted all resources');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  goBack() {
    this.router.navigate([ '/' ]);
  }

  addResourceId(resourceId) {
    const resourceIdArray = resourceId.map((data) => {
      return data._id;
    });
    this.couchService.post(`shelf/_find`, { 'selector': { 'user': this.userService.get().name } })
      .pipe(switchMap(data => {
        if (data.docs.length > 0) {
          data.docs[0].resourceIds.map((resource) => {
            if (resourceIdArray.indexOf(resource) === -1) {
              resourceIdArray.push(resource);
            }
          });
          return this.couchService.put('shelf/' + data.docs[0]._id + '?rev=' + data.docs[0]._rev,
          { ...data.docs[0], resourceIds: resourceIdArray });
        } else {
          return this.couchService.post('shelf',
            { resourceIds: resourceIdArray, 'user': this.userService.get().name });
        }
      })).subscribe((res) =>  {
        this.updateAddLibrary();
        this.selection.clear();
        this.planetMessageService.showAlert('Resource added to your library');
    }, (error) => (error));
  }

  updateAddLibrary() {
    this.getAddedLibrary().subscribe((res) => {
      this.setupList(this.resources.data, res.docs[0].resourceIds);
    });
  }

}
