import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { UserService } from '../shared/user.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './feedback.component.html',
})
export class FeedbackComponent implements OnInit, AfterViewInit {
  readonly dbName = 'feedback';
  message: string;
  deleteDialog: any;
  feedback = new MatTableDataSource();
  displayedColumns = [ 'type', 'priority', 'owner', 'title', 'status', 'openTime', 'closeTime', 'source', 'action' ];
  @ViewChild(MatPaginator) paginator: MatPaginator;
  user: any = {};

  constructor(
    private couchService: CouchService,
    private dialog: MatDialog,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.user = this.userService.get();
    this.getFeedback();
    this.feedback.filterPredicate = filterSpecificFields([ 'owner' ]);
    this.feedback.sortingDataAccessor = (item, property) => item[property].toLowerCase();
  }

  ngAfterViewInit() {
    this.feedback.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    this.feedback.filter = filterValue;
  }

  getFeedback() {
    this.couchService.allDocs(this.dbName)
      .subscribe((data) => {
        this.feedback.data = data.filter(fback  => {
          if (!this.user.isUserAdmin) {
            return fback.owner === this.user.name;
          }
          return fback;
        });
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
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
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
          this.planetMessageService.showAlert('You have deleted feedback.');
        }, (error) => this.deleteDialog.componentInstance.message = 'There is a problem deleting this feedback.');
    };
  }

  reply(feedback) {
    const title = 'Reply to: ' + feedback.owner;
    const type = 'feedback';
    const fields =
      [
        {
          'label': 'Message',
          'type': 'textarea',
          'name': 'message',
          'placeholder': 'Leave a comment',
          'required': true
        }
      ];
    const formGroup = {
      id: [ feedback._id ],
      replyTo: [ feedback.owner ],
      message: [ '', Validators.required ]
    };
    this.dialogsFormService
      .confirm(title, fields, formGroup)
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          this.addMessageToFeedback(res);
        }
      });
  }

  addMessageToFeedback(feedback) {
    const messages = [];
    this.couchService.get(this.dbName + '/' + feedback.id)
      .subscribe((data) => {
        data.messages.push({ 'message': feedback.message, 'time': Date.now(), 'user': this.user.name });
        this.couchService.put(this.dbName + '/' + data._id, {  ...data })
        .subscribe(() => {
          this.planetMessageService.showMessage('Reply success.');
        }, (error) => this.message = '');
      }, (error) => this.message = 'There is a problem of getting data.');
  }

  closeFeedback(feedback: any) {
    const updateFeedback =  { ...feedback, 'closeTime': Date.now(),  'status': 'Closed' };
    this.couchService.put(this.dbName + '/' + feedback._id, updateFeedback).subscribe((data) => {
      this.planetMessageService.showMessage('You closed this feedback.');
      this.getFeedback();
    },  (err) => console.log(err));
  }

}
