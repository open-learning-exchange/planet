import { Injectable } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { of, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService
  ) {}

  setNotificationsAsRead(notifications: any) {
    const unreadArray = (notifications || []).filter(notification => notification.status === 'unread')
      .map(notification => ({ ...notification, status: 'read' }));
    return this.couchService.bulkDocs('notifications', unreadArray).subscribe(() => {
      this.userService.setNotificationStateChange();
    }, () => this.planetMessageService.showAlert($localize`There was a problem marking all as read`));
  }

  deleteNotification(notification: any): Observable<any> {
    return this.couchService.delete('notifications/' + notification._id + '?rev=' + notification._rev).pipe(
      tap(() => {
        this.userService.setNotificationStateChange();
        this.planetMessageService.showMessage($localize`Notification deleted successfully`);
      }),
      catchError((err) => {
        this.planetMessageService.showAlert($localize`There was a problem deleting the notification`);
        return throwError(err);
      })
    );
  }

  clearReadNotifications(notifications: any[]): Observable<any> {
    const readArray = (notifications || [])
      .filter(notification => notification.status === 'read')
      .map(notification => ({ ...notification, _deleted: true }));
    if (readArray.length === 0) {
      return of([]);
    }
    return this.couchService.bulkDocs('notifications', readArray).pipe(
      tap(() => {
        this.userService.setNotificationStateChange();
        this.planetMessageService.showMessage($localize`Read notifications deleted successfully`);
      }),
      catchError((err) => {
        this.planetMessageService.showAlert($localize`There was a problem deleting read notifications`);
        return throwError(err);
      })
    );
  }

  sendNotificationToUser(notifications: any): Observable<any> {
    return this.couchService.findAll(
      'notifications',
      findDocuments({ link: notifications.link, type: notifications.type, status: notifications.status, user: notifications.user })
    ).pipe(
      switchMap((res: any[]) => res.length === 0 ? this.couchService.updateDocument('notifications', notifications) : of({}))
    );
  }
}
