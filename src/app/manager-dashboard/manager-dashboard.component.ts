import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CouchService } from '../shared/couchdb.service';
import { Router } from '@angular/router';
import { MatTableDataSource, MatSort, MatPaginator, MatDialog } from '@angular/material';
import { DialogsDeleteComponent } from '../shared/dialogs/dialogs-delete.component';
import { Location } from '@angular/common';
import { Validators } from '@angular/forms';
import { ValidatorService } from '../validators/validator.service';
import { DialogsFormService } from '../shared/dialogs/dialogs-form.service';
import { DialogsFormComponent } from '../shared/dialogs/dialogs-form.component';
import { HttpClient } from '@angular/common/http';


@Component({
  templateUrl: './manager-dashboard.component.html'
})

export class ManagerDashboardComponent implements OnInit, AfterViewInit {

  constructor(
    private couchService: CouchService,
    private router: Router,
    private dialog: MatDialog,
    private location: Location,
    private validatorService: ValidatorService,
    private dialogsFormService: DialogsFormService,
    private http: HttpClient
  ) { }

  currentUrl = this.router.url;
  viewTemplate = false;
  readonly dbName = 'feedback';
  message: string;
  deleteDialog: any;
  feedback = new MatTableDataSource();
  displayedColumns = [ 'isUrgent', 'feedback_type', 'comment', 'action' ];
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnInit() {
    if (this.currentUrl === '/manager/feedback') {
      this.viewTemplate = true;
      this.getFeedback();
    }
  }

  ngAfterViewInit() {
    this.feedback.paginator = this.paginator;
  }

  applyFilter(filterValue: string) {
    this.feedback.filter = filterValue.trim().toLowerCase();
  }

  getFeedback() {
    this.viewTemplate = true;
    this.couchService.get(this.dbName + '/_all_docs?include_docs=true')
      .subscribe((data) => {
        console.log(data);
        this.feedback.data = data.rows.map(feedback => {
          return feedback.doc;
        }).filter(fback  => {
          return fback['_id'].indexOf('_design') !== 0;
        });
      }, (error) => this.message = 'There is a problem of getting data.');
  }

  deleteClick(feedback) {
    this.deleteDialog = this.dialog.open(DialogsDeleteComponent, {
      data: {
        okClick: this.deleteFeedback(feedback),
        type: 'nation',
        displayName: feedback.type
      }
    });
    // Reset the message when the dialog closes
    this.deleteDialog.afterClosed().debug('Closing dialog').subscribe(() => {
      this.message = '';
    });
  }

  deleteFeedback(feedback) {
    // Return a function with nation on its scope so it can be called from the dialog
    return () => {
      const { _id: feedbackId, _rev: feedbackRev } = feedback;
      this.couchService.delete(this.dbName + '/' + feedbackId + '?rev=' + feedbackRev)
        .subscribe((data) => {
          // It's safer to remove the item from the array based on its id than to splice based on the index
          this.feedback.data = this.feedback.data.filter((fback: any) => data.id !== fback._id);
          this.deleteDialog.close();
        }, (error) => this.deleteDialog.componentInstance.message = 'There is a problem deleting this feedback.');
    };
  }

  back() {
    this.location.back();
  }

  reply(feedback) {
    console.log(feedback);
    const title = 'Reply';
    const type = 'feedback';
    const fields =
      [
        { 'label': '', 'type': 'hidden', 'name': 'nationUrl', 'value': 'ht.np' },
        { 'label': 'To', 'type': 'textbox', 'name': 'replyTo', 'readonly': true, 'value': 'nirojdyola@gmail.com' },
        { 'label': 'Reply', 'type': 'textarea', 'name': 'reply_message', 'placeholder': 'Leave a comment', 'required': true }
      ];
    const validation = {
      nationUrl: [ '', Validators.required ],
      replyTo: [ '', Validators.required ],
      reply_message: [ '', Validators.required ]
    };
    this.dialogsFormService
      .confirm(title, type, fields, validation, '')
      .debug('Dialog confirm')
      .subscribe((res) => {
        if (res !== undefined) {
          // this.onSubmit(res);
        }
      });
  }

}
