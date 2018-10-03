import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { debug } from '../debug-operator';
import { MatTableDataSource, MatPaginator, MatSort, MatDialog, PageEvent } from '@angular/material';
import { SelectionModel } from '@angular/cdk/collections';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, groupBy, mergeMap, toArray, flatMap, combineAll } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';
import { UserService } from '../shared/user.service';
import { environment } from '../../environments/environment';
import { SyncService } from '../shared/sync.service';
import { FormControl } from '../../../node_modules/@angular/forms';
import { PlanetTagInputComponent } from '../shared/forms/planet-tag-input.component';
import { findDocuments } from '../shared/mangoQueries';

@Component({
  templateUrl: './manage-reviews.component.html',
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

export class ManageReviewsComponent implements OnInit, AfterViewInit, OnDestroy {
  myRatings: any;
  courses = [];
  resources = [];
  ratings = new MatTableDataSource();
  pageEvent: PageEvent;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  readonly dbName = 'ratings';
  message = '';
  deleteDialog: any;
  selection = new SelectionModel(true, []);
  onDestroy$ = new Subject<void>();
  parent = this.route.snapshot.data.parent;
  displayedColumns = [ 'select', 'item', 'type', 'rate', 'comment', 'user' ];
  getOpts = this.parent ? { domain: this.userService.getConfig().parentDomain } : {};
  currentUser = this.userService.get();
  tagFilter = new FormControl([]);
  tagFilterValue = [];
  // As of v0.1.13 ResourcesComponent does not have download link available on parent view
  urlPrefix = environment.couchAddress + this.dbName + '/';


  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private planetMessageService: PlanetMessageService,
    private userService: UserService,
  ) { }



  ngOnInit() {

    this.couchService.allDocs('ratings')
      .pipe(
        switchMap(rating => rating),
        // group the ratings based on type
        groupBy(rating => rating['type']),
        mergeMap(group => group.pipe(toArray())),
        map((ratings) => {
          ratings.forEach((currentRating) => {
            // Currently we only have ratings for courses and resources
            if (currentRating['type'] === 'course') { this.courses.push(currentRating['item']); }
            else { this.resources.push(currentRating['item']); }
          });
          return ratings;
        }),
        flatMap((ratings) => {
          return this.getItemNames(ratings).pipe(
            map((items) => {
              // loop through ratings and add a name property for each one
              ratings.forEach((currentRating) => {
                items.forEach((currentItem) => {
                  if (currentRating['item'] === currentItem['_id']) {
                    // Items either have a title or courseTitle depending on their type resource or course
                    if (currentItem['title']) { currentRating['itemName'] = currentItem['title']; }
                    else { currentRating['itemName'] = currentItem['courseTitle']; }
                  }
                });
              });
              return ratings;
            }),
            combineAll()
          );
        }),
        combineAll()
      )
      .subscribe((ratings) => {
        this.ratings.data = ratings;
      });
  }


  getItemNames(ratings) {
    if (ratings[0]['type'] === 'course') {
      return this.couchService.findAll('courses', findDocuments({ '_id': { '$in': this.courses } }));
    } else {
      return this.couchService.findAll('resources', findDocuments({ '_id': { '$in': this.resources } }));
    }
  }

  onPaginateChange(e: PageEvent) {
    this.selection.clear();
  }

  ngAfterViewInit() {
    this.ratings.sort = this.sort;
    this.ratings.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.ratings.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.ratings.data.forEach(row => this.selection.select(row));
  }

  deleteSelected() {
    let amount = 'many',
      okClick = this.deleteRatings(this.selection.selected),
      displayName = '';
    if (this.selection.selected.length === 1) {
      const rating = this.selection.selected[0];
      amount = 'single';
      okClick = this.deleteRating(rating);
      displayName = rating.itemName;
    }
    this.openDeleteDialog(okClick, amount, displayName);
  }

  openDeleteDialog(okClick, amount, displayName = '') {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick,
        amount,
        changeType: 'delete',
        type: 'rating',
        displayName
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  deleteRating(rating) {
    return () => {
      const { _id: ratingId, _rev: ratingRev } = rating;
      this.couchService.delete(this.dbName + '/' + ratingId + '?rev=' + ratingRev)
        .subscribe((data) => {
          this.selection.deselect(rating);
          this.ratings.data = this.ratings.data.filter((res: any) => data.id !== res._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted rating: ' + rating._id);
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this rating.');
    };
  }

  deleteRatings(ratings) {
    return () => {
      const deleteArray = ratings.map((rating) => {
        return { _id: rating._id, _rev: rating._rev, _deleted: true };
      });
      this.couchService.post(this.dbName + '/_bulk_docs', { docs: deleteArray })
        .subscribe((data) => {
          this.selection.clear();
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted all ratings');
        }, (error) => this.deleteDialog.componentInstance.message = 'There was a problem deleting this rating.');
    };
  }

  goBack() {
    this.router.navigate([ '/manager' ]);
  }

}
