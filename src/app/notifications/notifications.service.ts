import { Injectable } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
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
}
