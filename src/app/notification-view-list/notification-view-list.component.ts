import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries'
@Component({
  template: `
    <p i18n>Your Notifications</p>
    <mat-list role="list" *ngFor="let notification of notifications">
      <mat-list-item (click)="readNotification(notification)">
      <mat-divider></mat-divider>
        <p [ngClass]="{'primary-text-color':notification.status==='unread'}">
          <a routerLink="/notifications">
            {{notification.message}} {{notification.time | date: 'MMM d, yyyy'}}
          </a>
        </p>
      </mat-list-item>
    </mat-list>
  `
})
export class NotificationViewComponent implements OnInit {
  notifications = [];
  constructor(
    private couchService: CouchService,
    private userService: UserService
    ) { }

  ngOnInit() {
    this.getNotifications();
  }

  getNotifications() {
    this.couchService.
    post('notifications/_find', findDocuments(
      { 'user': 'org.couchdb.user:' + this.userService.get().name },
      [ 'message', 'time', 'status' ],
      [ { 'time': 'desc' } ], 25))
    .subscribe(notification => {
       this.notifications = notification.docs;
    }, (err) => console.log(err.error.reason));
  }

  readNotification(notification) {
    const update_notificaton =  { ...notification, 'status': 'read' };
    if (notification.status === 'unread') {
      this.couchService.put('notifications/' + notification._id, update_notificaton)
      .subscribe((data) => {
      }, (err) => console.log(err));
    }
  }
}
