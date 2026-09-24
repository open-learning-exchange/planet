import { of } from 'rxjs';
import { vi } from 'vitest';
import { NotificationsService, notificationLink, notificationRecipient, notificationUserFilter } from './notifications.service';

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

  it('opens community reply notifications at the replied-to voice', () => {
    expect(notificationLink({ type: 'replyMessage', link: '/', replyTo: 'voice-1' })).toBe('/voices/voice-1');
    expect(notificationLink({ type: 'replyMessage', link: '/voices/root-1', replyTo: 'voice-1' })).toBe('/voices/voice-1');
    expect(notificationLink({ type: 'replyMessage', link: '/teams/view/team-1', replyTo: 'voice-1' })).toBe('/teams/view/team-1');
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

describe('NotificationsService reply notifications', () => {
  afterEach(() => vi.restoreAllMocks());

  const createService = (couchOverrides: any = {}, userOverrides: any = {}) => {
    const couchService = {
      findAll: vi.fn().mockReturnValue(of([])),
      bulkDocs: vi.fn().mockReturnValue(of([])),
      updateDocument: vi.fn().mockReturnValue(of({})),
      ...couchOverrides
    };
    const userService = {
      get: vi.fn().mockReturnValue({ name: 'learner1', ...userOverrides }),
      setNotificationStateChange: vi.fn()
    };
    const planetMessageService = {
      showAlert: vi.fn()
    };
    const stateService = {
      configuration: { code: 'planet-a' }
    };
    const service = new NotificationsService(
      userService as any,
      couchService as any,
      planetMessageService as any,
      stateService as any
    );
    return { service, couchService, userService };
  };

  it('retrieves unread replyTo IDs scoped to the current user and planet', () => {
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([ { replyTo: 'voice-123' }, { replyTo: 'voice-456' } ]))
    }, { planetCode: 'planet-a' });

    let result: string[] = [];
    service.getUnreadReplyIds$().subscribe(ids => {
      result = ids;
    });

    expect(result).toEqual([ 'voice-123', 'voice-456' ]);
    expect(couchService.findAll.mock.calls[0][1]).toEqual(expect.objectContaining({
      selector: {
        $or: [
          { user: 'org.couchdb.user:learner1', userPlanetCode: 'planet-a' },
          { user: 'org.couchdb.user:learner1', userPlanetCode: { $exists: false } }
        ],
        type: 'replyMessage',
        status: 'unread'
      },
      fields: [ 'replyTo' ]
    }));
  });

  it('notifies a same-named author on another planet', () => {
    const { service, couchService } = createService({}, {
      _id: 'org.couchdb.user:alex',
      name: 'alex',
      planetCode: 'planet-a'
    });

    service.sendReplyNotification({
      _id: 'news-1',
      createdOn: 'community-c',
      user: { _id: 'org.couchdb.user:alex', name: 'alex' },
      viewableBy: 'community'
    }, '/voices/news-1').subscribe();

    expect(couchService.updateDocument).toHaveBeenCalledWith('notifications', expect.objectContaining({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c',
      link: '/voices/news-1',
      type: 'replyMessage',
      replyTo: 'news-1'
    }));
  });

  it('does not notify the author when the composite identity matches', () => {
    const { service, couchService } = createService({}, {
      _id: 'org.couchdb.user:alex',
      name: 'alex',
      planetCode: 'planet-a'
    });

    service.sendReplyNotification({
      _id: 'news-1',
      createdOn: 'planet-a',
      user: { _id: 'org.couchdb.user:alex', name: 'alex', planetCode: 'planet-a' },
      viewableBy: 'nation'
    }, '/voices/news-1').subscribe();

    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('does not notify an associated parent account for its own home-planet post', () => {
    const { service, couchService } = createService({}, {
      _id: 'org.couchdb.user:alex@community-c',
      name: 'alex@community-c',
      planetCode: 'community-c',
      requestId: 'community-registration-request-1'
    });

    service.sendReplyNotification({
      _id: 'news-1',
      createdOn: 'community-c',
      user: { _id: 'org.couchdb.user:alex', name: 'alex', planetCode: 'community-c' },
      viewableBy: 'community'
    }, '/voices/news-1').subscribe();

    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('marks matching unread notifications as read when viewing a thread', () => {
    const mockNotifications = [
      { _id: 'n1', type: 'replyMessage', replyTo: 'voice-123', status: 'unread' }
    ];
    const bulkDocsSpy = vi.fn().mockReturnValue(of([]));
    const { service, userService } = createService({
      findAll: vi.fn().mockReturnValue(of(mockNotifications)),
      bulkDocs: bulkDocsSpy
    });

    service.markReplyNotificationsAsRead('voice-123');

    expect(bulkDocsSpy).toHaveBeenCalledWith('notifications', [
      { _id: 'n1', type: 'replyMessage', replyTo: 'voice-123', status: 'read' }
    ]);
    expect(userService.setNotificationStateChange).toHaveBeenCalled();
  });

  it('stores notifications for distinct replyTo targets on the same team page', () => {
    const updateDocumentSpy = vi.fn().mockReturnValue(of({ ok: true }));
    const { service, couchService } = createService({
      findAll: vi.fn().mockReturnValue(of([])),
      updateDocument: updateDocumentSpy
    });

    const notif1 = {
      user: 'org.couchdb.user:learner1',
      link: '/teams/view/team-1',
      type: 'replyMessage',
      replyTo: 'voice-1',
      status: 'unread'
    };
    const notif2 = {
      user: 'org.couchdb.user:learner1',
      link: '/teams/view/team-1',
      type: 'replyMessage',
      replyTo: 'voice-2',
      status: 'unread'
    };

    service.sendNotificationToUser(notif1).subscribe();
    service.sendNotificationToUser(notif2).subscribe();

    expect(couchService.findAll).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        selector: expect.objectContaining({ replyTo: 'voice-1' })
      })
    );
    expect(couchService.findAll).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({
        selector: expect.objectContaining({ replyTo: 'voice-2' })
      })
    );
    expect(updateDocumentSpy).toHaveBeenCalledTimes(2);
  });
});
