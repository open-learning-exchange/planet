import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService notifications', () => {
  it('routes role notifications through the recipient planet and stable CouchDB ID', () => {
    const notificationsService = {
      sendNotificationToUser: vi.fn().mockReturnValue(of({}))
    };
    const service = new UsersService(
      { datePlaceholder: 'now' } as any,
      {} as any,
      { couchStateListener: () => NEVER } as any,
      {} as any,
      notificationsService as any
    );

    service.sendNotifications({
      _id: 'alex@community-c',
      couchId: 'org.couchdb.user:alex',
      planetCode: 'community-c'
    }).subscribe();

    expect(notificationsService.sendNotificationToUser).toHaveBeenCalledWith({
      user: 'org.couchdb.user:alex',
      userPlanetCode: 'community-c',
      message: 'You were assigned a new role',
      link: '/myDashboard',
      type: 'newRole',
      priority: 1,
      status: 'unread',
      time: 'now'
    });
  });

  it('cleans associated and code-less task identities when deleting users', () => {
    const couchService = {
      datePlaceholder: 'now',
      get: vi.fn().mockReturnValue(of({ _rev: '1-shelf' })),
      delete: vi.fn().mockReturnValue(of({})),
      findAll: vi.fn().mockReturnValue(of([])),
      bulkDocs: vi.fn().mockReturnValue(of([]))
    };
    const tasksService = { removeAssigneeFromTasks: vi.fn().mockReturnValue(of([])) };
    const service = new UsersService(
      couchService as any,
      {} as any,
      { configuration: { code: 'planet-a' }, couchStateListener: () => NEVER } as any,
      tasksService as any,
      {} as any
    );

    service.deleteUser({
      _id: 'org.couchdb.user:alex@planet-b',
      couchId: 'org.couchdb.user:alex',
      _rev: '1-user',
      name: 'alex',
      planetCode: 'planet-b',
      requestId: 'request-1'
    }).subscribe();

    expect(tasksService.removeAssigneeFromTasks).toHaveBeenCalledWith(
      'org.couchdb.user:alex',
      [ 'planet-b', 'planet-a' ]
    );

    tasksService.removeAssigneeFromTasks.mockClear();
    service.deleteUser({
      _id: 'org.couchdb.user:legacy',
      _rev: '1-user',
      name: 'legacy'
    }).subscribe();

    expect(tasksService.removeAssigneeFromTasks).toHaveBeenCalledWith(
      'org.couchdb.user:legacy',
      undefined
    );
  });
});
