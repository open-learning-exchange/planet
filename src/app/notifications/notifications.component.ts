import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { findDocuments } from '../shared/mangoQueries';
import { filterDropdowns } from '../shared/table-helpers';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource, MatTable, MatColumnDef, MatCellDef, MatCell, MatRowDef, MatRow, MatNoDataRow } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { NotificationsService } from './notifications.service';
import { MatToolbar } from '@angular/material/toolbar';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { NgClass, DatePipe } from '@angular/common';
import { MatOption } from '@angular/material/autocomplete';
import { RouterLink } from '@angular/router';
import { ChallengesService } from '../shared/challenges/challenges.service';

@Component({
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
  imports: [
    MatToolbar,
    MatButton,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
    MatTable,
    MatColumnDef,
    MatCellDef,
    MatCell,
    NgClass,
    RouterLink,
    MatRowDef,
    MatRow,
    MatNoDataRow,
    MatPaginator,
    DatePipe
  ]
})
export class NotificationsComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator: MatPaginator;
  notifications = new MatTableDataSource<any>();
  displayedColumns = [ 'message', 'read' ];
  private onDestroy$ = new Subject<void>();
  notificationStatus = [
    { value: 'all', label: $localize`All` },
    { value: 'read', label: $localize`Read` },
    { value: 'unread', label: $localize`Unread` }
  ];
  filter = { 'status': '' };
  anyUnread = true;

  constructor(
    private dialog: MatDialog,
    private notificationsService: NotificationsService,
    private couchService: CouchService,
    private userService: UserService,
    private challengesService: ChallengesService,
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
      this.couchService.put('notifications/' + notification._id, updateNotificaton).subscribe((data) => {
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

  openAnnouncementDialog(notification?: any) {
    const challenge = notification ?
      this.challengesService.getChallengeForNotification(notification) :
      this.challengesService.getActiveChallenge();
    if (challenge) {
      this.challengesService.openChallengeDialog(this.dialog, challenge);
    }
  }
}
