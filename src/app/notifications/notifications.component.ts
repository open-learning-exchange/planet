import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PlanetMessageService } from '../shared/planet-message.service';

import { MatTableDataSource, MatPaginator, PageEvent } from '@angular/material';

@Component({
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  notifications = new MatTableDataSource();
  displayedColumns = [ 'message' ];
  private onDestroy$ = new Subject<void>();
  emptyData = false;

  constructor(
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private userService: UserService
    ) {
    this.userService.notificationStateChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getNotifications();
    });
  }

  ngOnInit() {
    this.getNotifications();
  }

  ngAfterViewInit() {
    this.notifications.paginator = this.paginator;
  }

  getNotifications() {
    const userFilter = [ {
      'user': 'org.couchdb.user:' + this.userService.get().name
    } ];
    if (this.userService.get().isUserAdmin) {
      userFilter.push({ 'user': 'SYSTEM' });
    }
    this.couchService.findAll('notifications/_find', findDocuments(
      { '$or': userFilter,
      // The sorted item must be included in the selector for sort to work
        'time': { '$gt': 0 }
      },
      0,
      [ { 'time': 'desc' } ]))
    .subscribe(notification => {
       this.notifications.data = notification;
       this.emptyData = !this.notifications.data.length;
    }, (err) => console.log(err.error.reason));
  }

  markRead(notification) {
    this.couchService.put('notifications/' + notification._id, { ...notification, 'status': 'read' })
    .subscribe((data) => {
        this.planetMessageService.showMessage('This notification has marked as read');
    });
  }

  readNotification(notification) {
    const updateNotificaton =  { ...notification, 'status': 'read' };
    if (notification.status === 'unread') {
      this.couchService.put('notifications/' + notification._id, updateNotificaton)
      .subscribe((data) => {
        this.notifications.data = this.notifications.data.map((n: any) => {
          if (n._id === data.id) {
            return Object.assign(updateNotificaton, { _rev: data.rev });
          }
          return n;
        });
        this.userService.setNotificationStateChange();
      }, (err) => console.log(err));
    }
  }
}
