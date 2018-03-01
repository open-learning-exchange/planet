import { Component, OnInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';

@Component({
  template: `
    Your Notifications
    <mat-list role="list" *ngFor="let notification of notifications">
      <mat-list-item (click)="readNotification(notification)">
      <mat-divider></mat-divider>
        <p [ngClass]="{'menu-item-text':notification.status==='unread'}">
          <a>
            {{notification.message}} {{notification.time | date: 'MMM d, yyyy'}}
          </a>
        </p>
      </mat-list-item>
    </mat-list>
  `,
  styles: [ `
    .menu-item-text {
    color: green;
    }
  ` ]
})
export class NotificationViewListComponent implements OnInit {
  notifications = [];
  constructor(
    private couchService: CouchService,
    private userService: UserService
    ) { }

  ngOnInit() {
    this.getNotification();
  }

  getNotification() {
    const user_id = 'org.couchdb.user:' + this.userService.get().name;
    this.couchService.get('notifications/_all_docs?include_docs=true')
      .subscribe((data) => {
        let cnt = 0;
        data.rows.sort((a, b) => 0 - (new Date(a.doc.time) > new Date(b.doc.time) ? 1 : -1));
        this.notifications = data.rows.map(notifications => {
          if (notifications.doc.status === 'unread') {
            cnt ++;
          }
          return notifications.doc;
        }).filter(nt  => {
          return nt['user'] === user_id;
        });
        this.notifications['count_unread'] =  cnt;
      }, (error) => console.log(error));
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
