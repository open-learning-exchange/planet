import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { UserService } from '../shared/user.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { PlanetMessageService } from '../shared/planet-message.service';
import { FeedbackService } from './feedback.service';
import { findDocuments } from '../shared/mangoQueries';
import { debug } from '../debug-operator';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs/Subject';

@Component({
  templateUrl: './feedback.component.html',
  styles: [ `
    .mat-column-type {
      display: flex;
      align-items: center;
    }
  ` ]
})
export class FeedbackComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly dbName = 'feedback';
  message: string;
  deleteDialog: any;
  feedback = new MatTableDataSource();
  displayedColumns = [ 'title', 'type', 'priority', 'owner', 'status', 'openTime', 'closeTime', 'source', 'action' ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  user: any = {};
  private onDestroy$ = new Subject<void>();

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService,
    private feedbackService: FeedbackService
  ) {
    if (this.userService.getConfig().planetType === 'community') {
      // Remove source from displayed columns for communities
      this.displayedColumns.splice(this.displayedColumns.indexOf('source'), 1);
    }
    this.feedbackService.feedbackUpdate$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getFeedback();
    });
   }

  ngOnInit() {
    this.user = this.userService.get();
    this.getFeedback();
    this.feedback.filterPredicate = filterSpecificFields([ 'owner' ]);
    this.feedback.sort = this.sort;
  }

  ngAfterViewInit() {
    this.feedback.paginator = this.paginator;
    this.feedback.sortingDataAccessor = (item, property) => item[property];
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  applyFilter(filterValue: string) {
    this.feedback.filter = filterValue;
  }

  getFeedback() {
    const selector = !this.user.isUserAdmin ? { 'owner': this.user.name } : { '_id': { '$gt': null } };
    this.couchService.post(this.dbName + '/_find', findDocuments(selector, 0, [ { 'openTime': 'desc' } ]))
      .subscribe((data) => {
        this.feedback.data = data.docs;
      }, (error) => this.message = 'There is a problem of getting data.');
  }

  deleteClick(feedback) {
    this.deleteDialog = this.dialog.open(DialogsPromptComponent, {
      data: {
        okClick: this.deleteFeedback(feedback),
        changeType: 'delete',
        type: 'feedback',
        displayName: feedback.type
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().pipe(debug('Closing dialog')).subscribe(() => {
      this.message = '';
    });
  }

  deleteFeedback(feedback) {
    // Return a function with feedback on its scope so it can be called from the dialog
    return () => {
      const { _id: feedbackId, _rev: feedbackRev } = feedback;
      this.couchService.delete(this.dbName + '/' + feedbackId + '?rev=' + feedbackRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.feedback.data = this.feedback.data.filter((fback: any) => data.id !== fback._id);
          this.deleteDialog.close();
          this.planetMessageService.showMessage('You have deleted feedback.');
        }, (error) => this.deleteDialog.componentInstance.message = 'There is a problem deleting this feedback.');
    };
  }

  closeFeedback(feedback: any) {
    const updateFeedback =  { ...feedback, 'closeTime': Date.now(),  'status': 'Closed' };
    this.couchService.put(this.dbName + '/' + feedback._id, updateFeedback).subscribe((data) => {
      this.planetMessageService.showMessage('You closed this feedback.');
      this.getFeedback();
    },  (err) => console.log(err));
  }

  openFeedback(feedback: any) {
    const updateFeedback =  { ...feedback, closeTime: '',  status: 'Reopened' };
    this.couchService.put(this.dbName + '/' + feedback._id, updateFeedback).subscribe((data) => {
      this.planetMessageService.showMessage('You re-opened this feedback.');
      this.getFeedback();
    },  (err) => console.log(err));
  }

}
