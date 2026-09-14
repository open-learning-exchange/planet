import { of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationsService, notificationRecipient, notificationUserFilter } from './notifications.service';

describe('NotificationsService', () => {
  it('uses the stable CouchDB ID and origin planet for a synchronized recipient', () => {
    expect(notificationRecipient({
      _id: 'alex@community-c',
      couchId: 'org.couchdb.user:alex',
      planetCode: 'community-c'
    })).toEqual({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c'
    });
  });

  it('normalizes an associated parent account to its home CouchDB ID', () => {
    expect(notificationRecipient({
      _id: 'org.couchdb.user:alex@community-c',
      name: 'alex@community-c',
      planetCode: 'community-c',
      requestId: 'community-registration-request-1'
    })).toEqual({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c'
    });
  });

  it('does not strip a planet-like suffix from an unmarked user', () => {
    expect(notificationRecipient({
      _id: 'org.couchdb.user:alex@community-c',
      name: 'alex@community-c',
      planetCode: 'community-c'
    })).toEqual({
      user: 'org.couchdb.user:alex@community-c',
      userPlanetCode: 'community-c'
    });
  });

  it('uses a stable document origin for a legacy recipient', () => {
    expect(notificationRecipient(
      { _id: 'org.couchdb.user:alex' },
      'community-c'
    )).toEqual({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c'
    });
  });

  it('keeps origin-less legacy recipients planet-less', () => {
    expect(notificationRecipient({ _id: 'org.couchdb.user:alex' })).toEqual({
      user: 'org.couchdb.user:alex'
    });
  });

  it('builds planet-scoped user filters while retaining legacy and system notifications', () => {
    expect(notificationUserFilter({
      name: 'alex',
      planetCode: 'planet-a',
      isUserAdmin: true
    })).toEqual([
      { user: 'org.couchdb.user:alex', userPlanetCode: 'planet-a' },
      { user: 'org.couchdb.user:alex', userPlanetCode: { $exists: false } },
      { user: 'SYSTEM' }
    ]);
  });

  it('does not include system notifications for non-admin users', () => {
    expect(notificationUserFilter({ name: 'alex', planetCode: 'planet-a' })).toEqual([
      { user: 'org.couchdb.user:alex', userPlanetCode: 'planet-a' },
      { user: 'org.couchdb.user:alex', userPlanetCode: { $exists: false } }
    ]);
  });

  it('keeps the legacy user filter when the current user has no planet code', () => {
    expect(notificationUserFilter({ name: 'alex' })).toEqual([
      { user: 'org.couchdb.user:alex' }
    ]);
  });

  it('does not match server-local legacy rows for an associated account home planet', () => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn().mockReturnValue(of({ ok: true }))
    };
    const service = new NotificationsService(
      { get: () => ({ planetCode: 'community-c' }) } as any,
      couchService as any,
      {} as any,
      { configuration: { code: 'nation-n' } } as any
    );
    const notification = {
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c',
      link: '/teams/view/team-1',
      type: 'newTask',
      status: 'unread'
    };

    service.sendNotificationToUser(notification).subscribe();

    expect(couchService.findAll).toHaveBeenCalledWith('notifications', expect.objectContaining({
      selector: {
        user: 'org.couchdb.user:alex',
        userPlanetCode: 'community-c',
        link: '/teams/view/team-1',
        type: 'newTask',
        status: 'unread'
      }
    }));
    expect(couchService.updateDocument).toHaveBeenCalledWith('notifications', notification);
  });

  it('deduplicates server-local notifications even when the actor belongs to another planet', () => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([ { _id: 'legacy-notification' } ])),
      updateDocument: vi.fn()
    };
    const service = new NotificationsService(
      { get: () => ({ planetCode: 'community-c' }) } as any,
      couchService as any,
      {} as any,
      { configuration: { code: 'nation-n' } } as any
    );

    service.sendNotificationToUser({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'nation-n',
      link: '/teams/view/team-1',
      type: 'newTask',
      status: 'unread'
    }).subscribe();

    expect(couchService.findAll.mock.calls[0][1].selector).toEqual({
      user: 'org.couchdb.user:alex',
      $or: [
        { userPlanetCode: 'nation-n' },
        { userPlanetCode: { $exists: false } }
      ],
      link: '/teams/view/team-1',
      type: 'newTask',
      status: 'unread'
    });
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('keeps the legacy selector for notifications without a destination planet', () => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([ { _id: 'existing' } ])),
      updateDocument: vi.fn()
    };
    const service = new NotificationsService(
      { get: () => ({ planetCode: 'planet-a' }) } as any,
      couchService as any,
      {} as any,
      { configuration: { code: 'planet-a' } } as any
    );

    service.sendNotificationToUser({
      user: 'org.couchdb.user:alex',
      link: '/news',
      type: 'replyMessage',
      status: 'unread'
    }).subscribe();

    expect(couchService.findAll.mock.calls[0][1].selector).toEqual({
      user: 'org.couchdb.user:alex',
      link: '/news',
      type: 'replyMessage',
      status: 'unread'
    });
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('keeps the legacy selector when neither the sender nor notification has a planet code', () => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn().mockReturnValue(of({ ok: true }))
    };
    const service = new NotificationsService(
      { get: () => ({}) } as any,
      couchService as any,
      {} as any,
      { configuration: { code: 'planet-a' } } as any
    );
    const notification = {
      user: 'org.couchdb.user:alex',
      link: '/news',
      type: 'replyMessage',
      status: 'unread'
    };

    service.sendNotificationToUser(notification).subscribe();

    expect(couchService.findAll.mock.calls[0][1].selector).toEqual(notification);
    expect(couchService.updateDocument).toHaveBeenCalledWith('notifications', notification);
  });
});
