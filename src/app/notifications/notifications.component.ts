import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { filterDropdowns } from '../shared/table-helpers';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { NotificationsService } from './notifications.service';
import { DialogsAnnouncementComponent, includedCodes, challengePeriod } from '../shared/dialogs/dialogs-announcement.component';
import { StateService } from '../shared/state.service';

@Component({
  templateUrl: './notifications.component.html',
  styleUrls: [ './notifications.component.scss' ]
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  notifications = new MatTableDataSource<any>();
  displayedColumns = [ 'message', 'read' ];
  private onDestroy$ = new Subject<void>();
  notificationStatus = [ 'All', 'Read', 'Unread' ];
  filter = { 'status': '' };
  anyUnread = true;

  constructor(
    private dialog: MatDialog,
    private stateService: StateService,
    private notificationsService: NotificationsService,
    private couchService: CouchService,
    private userService: UserService,
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

  openAnnouncementDialog() {
    const challengeActive = includedCodes.includes(this.stateService.configuration.code) && challengePeriod;
    if (challengeActive) {
      this.dialog.open(DialogsAnnouncementComponent, {
        width: '50vw',
        maxHeight: '100vh'
      });
    }
  }
}
