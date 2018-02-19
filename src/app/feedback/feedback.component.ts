import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsPromptComponent } from '../shared/dialogs/dialogs-prompt.component';
import { DialogsMessageComponent } from '../shared/dialogs/dialogs-message.component';
import { Location } from '@angular/common';
import { Validators } from '@angular/forms';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsFormComponent } from '../shared/dialogs/dialogs-form.component';
import { UserService } from '../shared/user.service';
import { filterSpecificFields } from '../shared/table-helpers';
import { PlanetMessageService } from '../shared/planet-message.service';

@Component({
  templateUrl: './feedback.component.html',
  styles: [ `
    /* Consider using space-container app wide for route views */
    .space-container {
      margin: 64px 30px;
      background: none;
    }
  ` ]
})
export class FeedbackComponent implements OnInit, AfterViewInit {
  name = '';
  dialogsMessage: any;
  readonly dbName = 'feedback';
  message: string;
  deleteDialog: any;
  feedback = new MatTableDataSource();
  displayedColumns = [ 'type', 'priority', 'owner', 'title', 'status', 'openTime', 'closeTime', 'source', 'action' ];
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    private couchService: CouchService,
    private router: Router,
    private dialog: MatDialog,
    private location: Location,
    private dialogsFormService: DialogsFormService,
    private userService: UserService,
    private planetMessageService: PlanetMessageService
  ) { }

  ngOnInit() {
    this.getFeedback();
    this.feedback.filterPredicate = filterSpecificFields([ 'owner' ]);
  }

  ngAfterViewInit() {
    this.feedback.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    this.feedback.filter = filterValue.trim().toLowerCase();
  }

  getFeedback() {
    this.couchService.get(this.dbName + '/_all_docs?include_docs=true')
      .subscribe((data) => {
        this.feedback.data = data.rows.map(feedback => {
          return feedback.doc;
        }).filter(fback  => {
          return fback['_id'].indexOf('_design') !== 0;
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

  back() {
    this.location.back();
  }

  reply(feedback) {
    const title = 'Reply';
    const type = 'feedback';
    const fields =
      [
        { 'label': 'To', 'type': 'textbox', 'name': 'replyTo', 'readonly': true, 'value': feedback.owner , 'required': false },
        { 'label': 'Message', 'type': 'textarea', 'name': 'message', 'placeholder': 'Leave a comment', 'required': true }
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
          this.onSubmit(res);
        }
      });
  }

  onSubmit(feedback) {
    const messages = [];
    this.couchService.get(this.dbName + '/' + feedback.id)
      .subscribe((data) => {
        data.messages.push({ 'message': feedback.message, 'time': Date.now(), 'user': this.userService.get().name });
        this.couchService.put(this.dbName + '/' + data._id, {  ...data })
        .subscribe(() => {
          this.planetMessageService.showMessage('Reply success.');
        }, (error) => this.message = '');
      }, (error) => this.message = 'There is a problem of getting data.');
  }

  openFeedback(feedback: any) {
    feedback.selected = feedback.selected ? false : true;
    const msg = feedback.messages.map(message => {
      return message;
    });
    this.dialogsMessage = this.dialog.open(DialogsMessageComponent, {
      data: {
        type: 'FeedBack',
        Msg: msg
      }
    });
    // Reset the message when the dialog closes
    this.dialogsMessage.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  closeFeedback(feedback: any) {
    const update_feedback =  { ...feedback, 'closeTime': Date.now(),  'status': 'Closed' };
    this.couchService.put(this.dbName + '/' + feedback._id, update_feedback).subscribe((data) => {
      this.planetMessageService.showMessage('You closed this feedback.');
      this.getFeedback();
    },  (err) => console.log(err));
  }

}
