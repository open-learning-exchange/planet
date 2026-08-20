import { Injectable } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap, map, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

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
    const unreadArray = notifications.filter(notification => notification.status === 'unread')
      .map(notification => ({ ...notification, status: 'read' }));
    this.couchService.bulkDocs('notifications', unreadArray).subscribe(() => {
      this.userService.setNotificationStateChange();
    }, (err) => this.planetMessageService.showAlert($localize`There was a problem marking all as read`));
  }

  sendNotificationToUser(notifications: any): Observable<any> {
    return this.couchService.findAll(
      'notifications',
      findDocuments({ link: notifications.link, type: notifications.type , status: notifications.status, user: notifications.user })
    ).pipe(
      switchMap((res: any[]) => res.length === 0 ? this.couchService.updateDocument('notifications', notifications) : of({}))
    );
  }

  getUnreadReplyIds$(): Observable<string[]> {
    const user = this.userService.get();
    if (!user || !user.name) {
      return of([]);
    }
    return this.couchService.findAll(
      'notifications',
      findDocuments({
        user: 'org.couchdb.user:' + user.name,
        type: 'replyMessage',
        status: 'unread'
      })
    ).pipe(
      map((notifications: any[]) =>
        (notifications || [])
          .map((n: any) => n.replyTo)
          .filter(Boolean)
      ),
      catchError(() => of([]))
    );
  }

  markReplyNotificationsAsRead(replyToId: string): void {
    if (!replyToId) {
      return;
    }
    const user = this.userService.get();
    if (!user || !user.name) {
      return;
    }
    this.couchService.findAll(
      'notifications',
      findDocuments({
        user: 'org.couchdb.user:' + user.name,
        type: 'replyMessage',
        status: 'unread',
        replyTo: replyToId
      })
    ).subscribe((notifications: any[]) => {
      if (notifications && notifications.length > 0) {
        this.setNotificationsAsRead(notifications);
      }
    }, () => {});
  }
}

