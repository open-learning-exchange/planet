import { NEVER, of } from 'rxjs';
import { vi } from 'vitest';
import { UsersService } from './users.service';

describe('UsersService notifications', () => {
  const createService = ({ couch = {}, tasks = {}, notifications = {} }: any = {}) => {
    const couchService = {
      datePlaceholder: 'now',
      get: vi.fn().mockReturnValue(of({ _rev: '1-shelf' })),
      delete: vi.fn().mockReturnValue(of({})),
      findAll: vi.fn().mockReturnValue(of([])),
      bulkDocs: vi.fn().mockReturnValue(of([])),
      ...couch
    };
    const tasksService = { removeAssigneeFromTasks: vi.fn().mockReturnValue(of([])), ...tasks };
    const notificationsService = { sendNotificationToUser: vi.fn().mockReturnValue(of({})), ...notifications };
    return {
      couchService,
      tasksService,
      notificationsService,
      service: new UsersService(
        couchService as any,
        {} as any,
        { configuration: { code: 'planet-a' }, couchStateListener: () => NEVER } as any,
        tasksService as any,
        notificationsService as any
      )
    };
  };

  it('routes role notifications through the recipient planet and stable CouchDB ID', () => {
    const { service, notificationsService } = createService();

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

  it('limits destructive task cleanup to the deleted account origin', () => {
    const { service, tasksService } = createService();

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
      'planet-b'
    );

    tasksService.removeAssigneeFromTasks.mockClear();
    service.deleteUser({
      _id: 'org.couchdb.user:legacy',
      _rev: '1-user',
      name: 'legacy'
    }).subscribe();

    expect(tasksService.removeAssigneeFromTasks).toHaveBeenCalledWith(
      'org.couchdb.user:legacy',
      'planet-a'
    );
  });

  it('falls back to the local planet when the user carries no planet code', () => {
    const { service, couchService } = createService();

    service.deleteUserFromTeams({ _id: 'org.couchdb.user:alex' }).subscribe();

    expect(couchService.findAll).toHaveBeenCalledWith('teams', {
      selector: {
        userId: 'org.couchdb.user:alex',
        $or: [
          { userPlanetCode: 'planet-a' },
          { userPlanetCode: '' },
          { userPlanetCode: { $exists: false } }
        ]
      }
    });
  });

  it('filters code-less team rows by team origin and preserves same-named local accounts', () => {
    const matchingExplicit = {
      _id: 'foreign-explicit', userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b'
    };
    const matchingCodeless = {
      _id: 'foreign-codeless', userId: 'org.couchdb.user:alex', userPlanetCode: '', teamPlanetCode: 'planet-b'
    };
    const sameNamedLocal = {
      _id: 'local-explicit', userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a'
    };
    const localCodeless = {
      _id: 'local-codeless', userId: 'org.couchdb.user:alex', teamPlanetCode: 'planet-a'
    };
    const unknownOrigin = { _id: 'unknown', userId: 'org.couchdb.user:alex' };
    const findAll = vi.fn().mockReturnValue(of([
      matchingExplicit, matchingCodeless, sameNamedLocal, localCodeless, unknownOrigin
    ]));
    const { service, couchService } = createService({ couch: { findAll } });

    service.deleteUserFromTeams({
      _id: 'org.couchdb.user:alex@planet-b',
      couchId: 'org.couchdb.user:alex',
      planetCode: 'planet-b'
    }).subscribe();

    expect(couchService.findAll).toHaveBeenCalledWith('teams', {
      selector: {
        userId: { $in: [ 'org.couchdb.user:alex', 'org.couchdb.user:alex@planet-b' ] },
        $or: [
          { userPlanetCode: 'planet-b' },
          { userPlanetCode: 'planet-a' },
          { userPlanetCode: '' },
          { userPlanetCode: { $exists: false } }
        ]
      }
    });
    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [
      { ...matchingExplicit, _deleted: true },
      { ...matchingCodeless, _deleted: true }
    ]);
  });
});
