import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { UserService } from '../shared/user.service';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { MatTableDataSource, MatPaginator, MatSort, MatFormField, MatFormFieldControl, MatDialog, MatDialogRef } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';
import { forkJoin } from 'rxjs/observable/forkJoin';
import { findDocuments } from '../shared/mangoQueries';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';

@Component({
  templateUrl: './resources.component.html',
  styles: [ `
    /* Consider using space-container app wide for route views */
    .space-container {
      margin: 64px 30px;
      background: none;
    }
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

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private dialog: MatDialog,
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private httpclient: HttpClient,
    private dialogsFormService: DialogsFormService,
  ) {}

  ngOnInit() {
    forkJoin(this.getResources(), this.getRatings()).subscribe((results) => {
      const resourcesRes = results[0],
        ratingsRes = results[1];
      this.setupList(resourcesRes, ratingsRes.docs);
    }, (err) => console.log(err));
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

  getRatio(num, dem) {
    return (num / (num + dem)) * 100;
  }

  applyResFilter(filterResValue: string) {
    this.resources.filter = filterResValue.trim().toLowerCase();
  }

  setupList(resourcesRes, ratings) {
    this.resources.data = resourcesRes.rows.map((r: any) => {
      const resource = r.doc;
      const ratingIndex = ratings.findIndex(rating => {
        return resource._id === rating.item;
      });
      if (ratingIndex > -1) {
        const ratingInfo = this.addRatingToResource(resource._id, ratingIndex, ratings, {
          rateSum: 0,
          totalRating: 0,
          maleRating: 0,
          femaleRating: 0,
          hasRated: 0
        });
        return { ...resource, ...ratingInfo };
      }
      return { ...resource,  rateSum: 0, totalRating: 0, maleRating: 0, femaleRating: 0, hasRated: 0  };
    });
  }

  addRatingToResource = (id, index, ratings, ratingInfo) => {
    const rating = ratings[index];
    ratingInfo.totalRating++;
    ratingInfo.rateSum = ratingInfo.rateSum + parseInt(rating.rate, 10);
    if (rating.user.gender) {
      switch (rating.user.gender) {
        case 'male':
                    ratingInfo.maleRating++;
                    break;
        case 'female':
                      ratingInfo.femaleRating++;
                      break;
      }
    }
    if (rating.user.name) {
      ratingInfo.hasRated = (rating.user.name === this.userService.get().name) ? rating.rate :  ratingInfo.hasRated;
    } else {
      // since Admin profile is not accesible
      ratingInfo.hasRated = (rating.user === this.userService.get().name) ? rating.rate : ratingInfo.hasRated;
    }
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
    }, 0, 0, 1000)).pipe(catchError(err => {
      console.log(err);
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
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick,
        amount,
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
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this resource.');
    };
  }

  goBack() {
    this.location.back();
  }

  openRatingDialog(resource_id) {
    const title = 'Rating';
    const type = 'rating';
    const fields =
      [
        { 'label': 'Rate', 'type': 'rating', 'name': 'rate', 'placeholder': 'Your Rating', 'required': false },
        { 'label': 'Comment', 'type': 'textarea', 'name': 'comment', 'placeholder': 'Leave your comment', 'required': false }
      ];
    const validation = {
      item: [ resource_id ],
      rate: [ '' ],
      comment: [ '' ]
    };
    this.dialogsFormService
      .confirm(title, type, fields, validation, '')
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.rating(res);
        }
      });
  }

  rating(rating) {
    if (rating) {
      const user = this.userService.get().roles.indexOf('_admin') > -1 ? this.userService.get().name : this.userService.get().profile;
      const ratingData = {
        'user': user,
        'item': rating.item,
        'type': 'resource',
        'rate': rating.rate,
        'comment': rating.comment,
        'time': Date.now()
      };
      this.couchService.post('ratings', ratingData)
        .subscribe((data) => {
          console.log('Thank you for rating');
        }, (error) => console.log(error));
    }
  }

}
