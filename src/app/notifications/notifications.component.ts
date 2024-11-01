import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { filterDropdowns } from '../shared/table-helpers';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { NotificationsService } from './notifications.service';

@Component({
  templateUrl: './notifications.component.html',
  styleUrls: [ './notifications.component.scss' ]
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  notifications = new MatTableDataSource<any>();
  displayedColumns = [ 'message', 'read' ];
  private onDestroy$ = new Subject<void>();
  emptyData = false;
  notificationStatus = [ 'All', 'Read', 'Unread' ];
  filter = { 'status': '' };
  anyUnread = true;

  constructor(
    private couchService: CouchService,
    private userService: UserService,
    private notificationsService: NotificationsService
  ) {
    this.userService.notificationStateChange$.pipe(takeUntil(this.onDestroy$)).subscribe(() => {
      this.getNotifications();
    });
  }

  ngOnInit() {
    this.notifications.filterPredicate = filterDropdowns(this.filter);
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
    .subscribe(notifications => {
       this.notifications.data = notifications;
       this.anyUnread = this.notifications.data.some(notification => notification.status === 'unread');
       this.emptyData = !this.notifications.data.length;
    }, (err) => console.log(err.error.reason));
  }

  onFilterChange(filterValue: string) {
    this.filter['status'] = filterValue;
    this.notifications.filter = filterValue === 'all' ? '' : ' ';
  }

  readNotification(notification) {
    const updateNotificaton = { ...notification, 'status': 'read' };
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

  readAllNotification() {
    this.notificationsService.setNotificationsAsRead(this.notifications.data);
  }
}
