import { Injectable } from '@angular/core';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { PlanetMessageService } from '../shared/planet-message.service';
import { StateService } from '../shared/state.service';
import { findDocuments } from '../shared/mangoQueries';
import { switchMap, map, catchError, filter } from 'rxjs/operators';
import { of, Observable } from 'rxjs';

/**
 * Supports raw or replicated user docs and team-member rows. Callers holding a
 * fullUserDoc wrapper must pass its `doc` value.
 */
export const notificationRecipient = (user: any, legacyPlanetCode?: string) => {
  const userPlanetCode = user.userPlanetCode || user.planetCode || legacyPlanetCode;
  const storedUserId = user.couchId || user.userId || user._id;
  const associatedSuffix = userPlanetCode ? `@${userPlanetCode}` : '';
  const isAssociatedAccount = !!((user.requestId || user.sync) && associatedSuffix &&
    user.name?.endsWith(associatedSuffix) && storedUserId?.endsWith(associatedSuffix));
  return {
    user: isAssociatedAccount ? storedUserId.slice(0, -associatedSuffix.length) : storedUserId,
    ...(userPlanetCode ? { userPlanetCode } : {})
  };
};

export const notificationUserFilter = (user: any) => {
  const userId = `org.couchdb.user:${user.name}`;
  const userFilters = user.planetCode ?
    [
      { user: userId, userPlanetCode: user.planetCode },
      { user: userId, userPlanetCode: { $exists: false } }
    ] :
    [ { user: userId } ];
  return user.isUserAdmin ? [ ...userFilters, { user: 'SYSTEM' } ] : userFilters;
};

export const notificationLink = (notification: any) =>
  notification.type === 'replyMessage' && notification.replyTo && (notification.link === '/' || notification.link?.startsWith('/voices/')) ?
    `/voices/${notification.replyTo}` :
    notification.link;

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
      ...(notifications.replyTo ? { replyTo: notifications.replyTo } : {}),
      ...planetSelector
    };
    return this.couchService.findAll(
      'notifications',
      findDocuments(selector)
    ).pipe(
      switchMap((res: any[]) => res.length === 0 ? this.couchService.updateDocument('notifications', notifications) : of({}))
    );
  }

  sendReplyNotification(news: any, link: string): Observable<any> {
    const currentUser = this.userService.get();
    const serverPlanetCode = this.stateService.configuration.code;
    const recipient = notificationRecipient(news.user, news.createdOn || serverPlanetCode);
    const sender = notificationRecipient(currentUser, serverPlanetCode);
    if (recipient.user === sender.user && recipient.userPlanetCode === sender.userPlanetCode) {
      return of({});
    }
    return this.sendNotificationToUser({
      ...recipient,
      message: $localize`<b>${currentUser.name}</b> replied to your ${news.viewableBy === 'community' ? 'community ' : ''}message.`,
      link,
      priority: 1,
      type: 'replyMessage',
      replyTo: news._id,
      status: 'unread',
      time: this.couchService.datePlaceholder
    });
  }

  getUnreadReplyIds$(): Observable<string[]> {
    if (!this.userService.get().name) {
      return of([]);
    }
    return this.findUnreadReplies({}, [ 'replyTo' ]).pipe(
      map(notifications => notifications.map(notification => notification.replyTo).filter(Boolean)),
      catchError(() => of([]))
    );
  }

  markReplyNotificationsAsRead(replyTo: string) {
    this.findUnreadReplies({ replyTo }).pipe(
      filter(notifications => notifications.length > 0),
      switchMap(notifications => this.couchService.bulkDocs(
        'notifications', notifications.map(notification => ({ ...notification, status: 'read' }))
      ))
    ).subscribe(() => this.userService.setNotificationStateChange(), error => console.error(error));
  }

  private findUnreadReplies(selector: any, fields: any = 0): Observable<any[]> {
    return this.couchService.findAll('notifications', findDocuments(
      { $or: notificationUserFilter(this.userService.get()), type: 'replyMessage', status: 'unread', ...selector },
      fields
    ));
  }
}
