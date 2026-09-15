import { Injectable } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { userIdentity } from '../shared/identity.utils';

/** Supports raw user docs, replicated fullUserDoc wrappers, and team-member rows. */
export const notificationRecipient = (user: any, legacyPlanetCode?: string) => {
  const identity = userIdentity(user, legacyPlanetCode);
  return {
    user: identity.userId,
    ...(identity.userPlanetCode ? { userPlanetCode: identity.userPlanetCode } : {})
  };
};

export const notificationUserFilter = (user: any) => {
  const source = { ...user, _id: user._id || `org.couchdb.user:${user.name}` };
  const recipient = notificationRecipient(source);
  // The materialized ID is unique to this account under any code; the canonical ID is shared with a same-named native account.
  const hasMaterializedAlias = source._id !== recipient.user;
  const userFilters = recipient.userPlanetCode ? [
    { user: recipient.user, userPlanetCode: recipient.userPlanetCode },
    ...(hasMaterializedAlias ? [
      { user: source._id }
    ] : [
      { user: recipient.user, userPlanetCode: { $exists: false } }
    ])
  ] : [ { user: recipient.user } ];
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
