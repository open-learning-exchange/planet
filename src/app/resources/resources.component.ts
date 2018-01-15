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
import { switchMap, map } from 'rxjs/operators';
import { of } from 'rxjs/observable/of';

import { findDocuments } from '../shared/mangoQueries';


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
  mRating;
  fRating;
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
    private httpclient: HttpClient
  ) {}

  ngOnInit() {
    this.getResources();
    // Temp fields to fill in for male and female rating
    this.fRating = Math.floor(Math.random() * 101);
    this.mRating = 100 - this.fRating;
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

  getExternalResources() {
    this.couchService.post('nations/_find',
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
      })).subscribe((res: any) => {
        this.resources.data = res.rows.map(r => r.doc);
      }, error => (this.message = 'Error'));
  }

  getResources() {
    this.nationName = this.route.snapshot.paramMap.get('nationname');
    if (this.nationName !== null) {
      this.getExternalResources();
    } else {
      this.couchService
        .get('resources/_all_docs?include_docs=true')
        .subscribe(data => {
          this.resources.data = data.rows.map(res => {
            this.couchService
            .post('ratings/_find', findDocuments({ 'type': 'resource', 'item': res.id }, null))
            .subscribe((rating) => {
              let rate_sum = 0;
              let has_rated = 0;
              let total_rating = 0;
              let male_rating = 0;
              let female_rating = 0;
              rating.docs.map(rate => {
                has_rated = (rate.user === this.userService.get().name) ? rate.rate : has_rated;
                total_rating++;
                (rate.gender === 'M') ? male_rating++ : female_rating++ ;
                rate_sum = rate_sum + parseInt(rate.rate, 10);
              });
              res.doc.rating = rate_sum;
              res.doc.has_rated = has_rated;
              res.doc.female_rating = female_rating;
              res.doc.male_rating = male_rating;
              res.doc.total_rating = total_rating;
            }, error => (this.message = 'Error'));
            return res.doc;
          });

        }, error => (this.message = 'Error'));
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

}
