import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
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
export class NotificationsComponent implements OnInit {
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
      { 'user': 'org.couchdb.user:' + this.userService.get().name,
      // The sorted item must be included in the selector for sort to work
        'time': { '$gt': 0 }
      },
      0,
      [ { 'time': 'desc' } ], 25))
    .subscribe(notification => {
       this.notifications = notification.docs;
    }, (err) => console.log(err.error.reason));
  }

  readNotification(notification) {
    const updateNotificaton =  { ...notification, 'status': 'read' };
    if (notification.status === 'unread') {
      this.couchService.put('notifications/' + notification._id, updateNotificaton)
      .subscribe((data) => {
        this.notifications = this.notifications.map(n => {
          if (n._id === data.id) {
            return Object.assign(updateNotificaton, { _rev: data.rev });
          }
          return n;
        });
      }, (err) => console.log(err));
    }
  }
}
