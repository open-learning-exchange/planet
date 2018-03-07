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
import { UserService } from '../shared/user.service';
import { findDocuments } from '../shared/mangoQueries';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { Validators } from '@angular/forms';
import { filterSpecificFields } from '../shared/table-helpers';
import { environment } from '../../environments/environment';

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
    a:hover {
      color: #2196f3;
    }
    .mat-progress-bar {
      height: 10px;
      width: 120px;
    }
  ` ]
})
export class ResourcesComponent implements OnInit, AfterViewInit {
  resources = new MatTableDataSource();
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  displayedColumns = [ 'select', 'info', 'rating' ];
  readonly dbName = 'resources';
  message = '';
  file: any;
  deleteDialog: any;
  nationName = '';
  selection = new SelectionModel(true, []);
  urlPrefix = environment.couchAddress + this.dbName + '/';

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private httpclient: HttpClient,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
    private dialogsFormService: DialogsFormService,
  ) {}

  ngOnInit() {
    forkJoin(this.getResources(), this.getRatings()).subscribe((results) => {
      const resourcesRes = results[0],
        ratingsRes = results[1];
      this.setupList(resourcesRes.rows, ratingsRes.docs);
    }, (err) => console.log(err));
    this.resources.filterPredicate = filterSpecificFields([ 'title' ]);
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

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
    this.selection.clear() :
    this.resources.data.forEach(row => this.selection.select(row));
  }

  setupList(resourcesRes, ratings) {
    this.resources.data = resourcesRes.map((r: any) => {
      const resource = r.doc || r;
      const ratingIndex = ratings.findIndex(rating => {
        return resource._id === rating.item;
      });
      if (ratingIndex > -1) {
        const ratingInfo = this.addRatingToResource(resource._id, ratingIndex, ratings, {});
        return { ...resource, rating: ratingInfo };
      }
      return { ...resource,  rating: { rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, userRating: {}  } };
    });
  }

  addRatingToResource(id, index, ratings, ratingInfo: any) {
    const rating = ratings[index];
    // If totalRating is undefined, will start count at 1
    ratingInfo.totalRating = ratingInfo.totalRating + 1 || 1;
    ratingInfo.rateSum = ratingInfo.rateSum + rating.rate || rating.rate;
    if (rating.user.gender) {
      switch (rating.user.gender) {
        case 'male':
          ratingInfo.maleRating = ratingInfo.maleRating + 1 || 1;
          break;
        case 'female':
          ratingInfo.femaleRating = ratingInfo.femaleRating + 1 || 1;
          break;
      }
    }
    ratingInfo.userRating = rating.user.name === this.userService.get().name ? rating : ratingInfo.userRating;
    if (ratings.length > index + 1 && ratings[index + 1].item === id) {
      // Ratings are sorted by resource id,
      // so this recursion will add all ratings to resource
      return this.addRatingToResource(id, index + 1, ratings, ratingInfo);
    }
    return ratingInfo;
  }

  getRatings() {
    return this.couchService.post('ratings/_find', findDocuments({
      // Selector
      'type': 'resource',
      // Must have sorted property in selector to sort correctly
      'item': { '$gt': null }
    }, 0, [ { 'item': 'desc' } ], 1000)).pipe(catchError(err => {
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
    }
    return this.couchService.get(this.dbName + '/_all_docs?include_docs=true');
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

  updateRatings() {
    this.getRatings().subscribe((res) => {
      this.setupList(this.resources.data, res.docs);
    });
  }

  /*
  openRatingDialog(element) {
    const title = 'Rating';
    const type = 'rating';
    const fields =
      [
        { 'label': 'Rate', 'type': 'rating', 'name': 'rate', 'placeholder': 'Your Rating', 'required': false },
        { 'label': 'Comment', 'type': 'textarea', 'name': 'comment', 'placeholder': 'Leave your comment', 'required': false }
      ];
    const formGroup = {
      rate: [ element.hasRated || '', Validators.required ],
      comment: [ element.comment || '' ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.postRating(res, element);
        }
      });
  }

  postRating(rating, element) {
    if (rating) {
      const user = this.userService.get();
      const ratingData = {
        'user': user,
        'item': element._id,
        'type': 'resource',
        'rate': rating.rate,
        'comment': rating.comment,
        'time': Date.now()
      };
      if (element.ratingId !== '' && element.ratingRev !== '') {
        Object.assign(ratingData, { _id: element.ratingId, _rev: element.ratingRev });
      }
      this.couchService.post('ratings', ratingData)
        .subscribe((data) => {
           this.ngOnInit();
           console.log('Thank you for rating');
        }, (error) => console.log(error));
    }
  }
  */

}
