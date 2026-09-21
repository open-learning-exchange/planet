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

  it('cleans an associated account\'s tasks globally only under its own materialized ID', () => {
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
      'org.couchdb.user:alex@planet-b',
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
      [ 'planet-a' ]
    );
  });

  it('scopes a native account\'s team cleanup to the local planet when the user carries no planet code', () => {
    const local = { _id: 'local', userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a' };
    const localCodeless = { _id: 'local-codeless', userId: 'org.couchdb.user:alex', userPlanetCode: '', teamPlanetCode: 'planet-a' };
    const sameNamedElsewhere = { _id: 'elsewhere', userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b' };
    const unknownOrigin = { _id: 'unknown', userId: 'org.couchdb.user:alex' };
    const findAll = vi.fn().mockReturnValue(of([ local, localCodeless, sameNamedElsewhere, unknownOrigin ]));
    const { service, couchService } = createService({ couch: { findAll } });

    service.deleteUserFromTeams({ _id: 'org.couchdb.user:alex' }).subscribe();

    expect(couchService.findAll).toHaveBeenCalledWith('teams', {
      selector: {
        userId: { $in: [ 'org.couchdb.user:alex' ] },
        $or: [
          { userPlanetCode: 'planet-a' },
          { userPlanetCode: '' },
          { userPlanetCode: { $exists: false } }
        ]
      }
    });
    expect(couchService.bulkDocs).toHaveBeenCalledWith('teams', [
      { ...local, _deleted: true },
      { ...localCodeless, _deleted: true }
    ]);
  });

  it('rejects identity-less team cleanup before querying', () => {
    const { service, couchService } = createService();
    const error = vi.fn();

    service.deleteUserFromTeams({ planetCode: 'planet-a' }).subscribe({ error });

    expect(error).toHaveBeenCalledWith(expect.objectContaining({
      message: 'User ID is required for team cleanup.'
    }));
    expect(couchService.findAll).not.toHaveBeenCalled();
    expect(couchService.bulkDocs).not.toHaveBeenCalled();
  });

  it('deletes an associated account\'s rows without removing its home planet\'s native account from synchronized teams', () => {
    const materialized = { _id: 'materialized', userId: 'org.couchdb.user:alex@planet-b', userPlanetCode: 'planet-a' };
    const canonicalOnLocalTeam = {
      _id: 'canonical-local-team', teamId: 'local-team',
      userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b', teamPlanetCode: 'planet-a'
    };
    const canonicalOnHomeTeam = {
      _id: 'canonical-home-team', teamId: 'home-team',
      userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-b', teamPlanetCode: 'planet-b'
    };
    const sameNamedLocal = {
      _id: 'same-named-local', userId: 'org.couchdb.user:alex', userPlanetCode: 'planet-a', teamPlanetCode: 'planet-a'
    };
    const unknownOrigin = { _id: 'unknown', userId: 'org.couchdb.user:alex' };
    const findAll = vi.fn().mockReturnValue(of([
      materialized, canonicalOnLocalTeam, canonicalOnHomeTeam, sameNamedLocal, unknownOrigin
    ]));
    const { service, couchService, tasksService } = createService({ couch: { findAll } });

    service.deleteUserFromTeams({
      _id: 'org.couchdb.user:alex@planet-b',
      name: 'alex@planet-b',
      planetCode: 'planet-b',
      requestId: 'request-1'
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
      { ...materialized, _deleted: true },
      { ...canonicalOnLocalTeam, _deleted: true }
    ]);
    expect(tasksService.removeAssigneeFromTasks).toHaveBeenCalledTimes(1);
    expect(tasksService.removeAssigneeFromTasks).toHaveBeenCalledWith(
      'org.couchdb.user:alex', 'planet-b', { teams: { $in: [ 'local-team' ] } }
    );
  });
});
