import { NEVER, of, throwError } from 'rxjs';
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

describe('UsersService admin promotion', () => {
  const adminUser = {
    _id: 'org.couchdb.user:alex',
    _rev: '1-user',
    name: 'alex',
    type: 'user',
    roles: [ 'learner' ],
    password_scheme: 'pbkdf2',
    derived_key: 'key',
    salt: 'salt',
    iterations: 10
  };

  const buildService = (couchService: any, configuration: any) => new UsersService(
    couchService as any,
    {} as any,
    { configuration, couchStateListener: () => NEVER } as any,
    {} as any,
    {} as any
  );

  const buildCouchService = (overrides: any = {}) => ({
    datePlaceholder: 'now',
    get: vi.fn().mockImplementation((db: string) =>
      db.indexOf('tablet_users') === 0 ? throwError({ status: 404 }) : throwError({ status: 404 })
    ),
    put: vi.fn().mockReturnValue(of({})),
    delete: vi.fn().mockReturnValue(of({})),
    updateDocument: vi.fn().mockReturnValue(of({})),
    ...overrides
  });

  it('promotes the user when the parent planet cannot be reached', () => {
    const couchService = buildCouchService({
      updateDocument: vi.fn().mockReturnValue(throwError({ status: 0 }))
    });
    const service = buildService(couchService, { code: 'planet-a', _id: 'config-1', parentDomain: 'nation.org' });
    let response;

    service.promoteToAdmin({ ...adminUser }).subscribe((res) => response = res);

    expect(response).toEqual({ parentSyncFailed: true });
    expect(couchService.put).toHaveBeenCalledWith(
      '_node/nonode@nohost/_config/admins/alex',
      '-pbkdf2-key,salt,10'
    );
    const [ , promotedUser ] = couchService.put.mock.calls
      .find(([ db ]) => db === '_users/org.couchdb.user:alex');
    expect(promotedUser.isUserAdmin).toBe(true);
    expect(promotedUser.roles).toEqual([]);
  });

  it('skips the parent planet when there is none to sync with', () => {
    const couchService = buildCouchService();
    const service = buildService(couchService, { code: 'planet-a', _id: 'config-1', parentDomain: '' });
    let response;

    service.promoteToAdmin({ ...adminUser }).subscribe((res) => response = res);

    expect(response).toEqual({ parentSyncFailed: false });
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('creates a role-less parent account when the parent refuses to set roles', () => {
    const updateDocument = vi.fn()
      .mockReturnValueOnce(throwError({ status: 403 }))
      .mockReturnValueOnce(of({ id: 'org.couchdb.user:alex@planet-a' }));
    const couchService = buildCouchService({ updateDocument });
    const service = buildService(couchService, { code: 'planet-a', _id: 'config-1', parentDomain: 'nation.org' });
    let response;

    service.promoteToAdmin({ ...adminUser }).subscribe((res) => response = res);

    expect(response).toEqual({ parentSyncFailed: false });
    expect(updateDocument.mock.calls[0][1].roles).toEqual([ 'learner' ]);
    expect(updateDocument.mock.calls[1][1].roles).toEqual([]);
    expect(updateDocument.mock.calls[1][1]._id).toBe('org.couchdb.user:alex@planet-a');
  });

  it('deletes the tablet user with its own revision', () => {
    const couchService = buildCouchService({
      get: vi.fn().mockImplementation((db: string) => db === 'tablet_users/org.couchdb.user:alex' ?
        of({ _id: 'org.couchdb.user:alex', _rev: '3-tablet' }) :
        throwError({ status: 404 })
      )
    });
    const service = buildService(couchService, { code: 'planet-a', _id: 'config-1', parentDomain: '' });

    service.promoteToAdmin({ ...adminUser }).subscribe();

    expect(couchService.delete).toHaveBeenCalledWith('tablet_users/org.couchdb.user:alex?rev=3-tablet');
  });
});
