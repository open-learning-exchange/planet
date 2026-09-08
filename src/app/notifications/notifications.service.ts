import { Injectable } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { canonicalUserId } from '../shared/identity.utils';

/**
 * Supports raw or replicated user docs and team-member rows. Callers holding a
 * fullUserDoc wrapper must pass its `doc` value.
 */
export const notificationRecipient = (user: any, legacyPlanetCode?: string) => {
  const userPlanetCode = user.userPlanetCode || user.planetCode || legacyPlanetCode;
  return {
    user: canonicalUserId(user, userPlanetCode),
    ...(userPlanetCode ? { userPlanetCode } : {})
  };
};

export const notificationUserFilter = (user: any) => {
  const source = { ...user, _id: user._id || `org.couchdb.user:${user.name}` };
  const recipient = notificationRecipient(source);
  // Notifications stored before ID normalization address the materialized @planet ID, and writers
  // outside notificationRecipient still use it, so the reader accepts both forms of the own account ID.
  const recipientIds = [ ...new Set([ recipient.user, source._id ]) ];
  const userFilters = recipientIds.flatMap(recipientId => recipient.userPlanetCode ?
    [
      { user: recipientId, userPlanetCode: recipient.userPlanetCode },
      { user: recipientId, userPlanetCode: { $exists: false } }
    ] :
    [ { user: recipientId } ]);
  return user.isUserAdmin ? [ ...userFilters, { user: 'SYSTEM' } ] : userFilters;
};

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  constructor(
    private userService: UserService,
    private couchService: CouchService,
    private planetMessageService: PlanetMessageService,
    private stateService: StateService
  ) {}

  setNotificationsAsRead(notifications: any) {
    const unreadArray = notifications.filter(notification => notification.status === 'unread')
      .map(notification => ({ ...notification, status: 'read' }));
    this.couchService.bulkDocs('notifications', unreadArray).subscribe(() => {
      this.userService.setNotificationStateChange();
    }, (err) => this.planetMessageService.showAlert($localize`There was a problem marking all as read`));
  }

  sendNotificationToUser(notifications: any): Observable<any> {
    const serverPlanetCode = this.stateService.configuration.code;
    const planetSelector = notifications.userPlanetCode && notifications.userPlanetCode === serverPlanetCode ?
      {
        $or: [
          { userPlanetCode: serverPlanetCode },
          { userPlanetCode: { $exists: false } }
        ]
      } :
      notifications.userPlanetCode ? { userPlanetCode: notifications.userPlanetCode } : {};
    const selector = {
      link: notifications.link,
      type: notifications.type,
      status: notifications.status,
      user: notifications.user,
      ...planetSelector
    };
    return this.couchService.findAll(
      'notifications',
      findDocuments(selector)
    ).pipe(
      switchMap((res: any[]) => res.length === 0 ? this.couchService.updateDocument('notifications', notifications) : of({}))
    );
  }
}
