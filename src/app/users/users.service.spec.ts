import { NEVER, Observable, of, throwError } from 'rxjs';
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

describe('UsersService community account deletion', () => {
  const registration = { _id: 'request-1', _rev: '2-reg', adminName: 'admin@planet-b' };

  const deleteAssociatedUser = (name: string, registrationResult: Observable<any> = of(registration)) => {
    const order: string[] = [];
    const couchService = {
      get: vi.fn().mockImplementation((db: string) =>
        db.startsWith('communityregistrationrequests/') ? registrationResult : of({ _rev: '1-shelf' })),
      delete: vi.fn().mockImplementation((db: string) => {
        order.push(db);
        return of({});
      }),
      findAll: vi.fn().mockReturnValue(of([])),
      bulkDocs: vi.fn().mockReturnValue(of([]))
    };
    const service = new UsersService(
      couchService as any,
      {} as any,
      { configuration: { code: 'nation' }, couchStateListener: () => NEVER } as any,
      { removeAssigneeFromTasks: vi.fn().mockReturnValue(of([])) } as any,
      {} as any
    );
    service.deleteUser({ _id: 'org.couchdb.user:' + name, _rev: '1-user', name, requestId: 'request-1' }).subscribe();
    return order;
  };

  it('disconnects the community by deleting its registration before its registered admin', () => {
    expect(deleteAssociatedUser('admin@planet-b')).toEqual([
      'communityregistrationrequests/request-1?rev=2-reg',
      '_users/org.couchdb.user:admin@planet-b?rev=1-user',
      'shelf/org.couchdb.user:admin@planet-b?rev=1-shelf'
    ]);
  });

  it('keeps the registration when deleting a promoted admin of the community', () => {
    expect(deleteAssociatedUser('ops@planet-b')).toEqual([
      '_users/org.couchdb.user:ops@planet-b?rev=1-user',
      'shelf/org.couchdb.user:ops@planet-b?rev=1-shelf'
    ]);
  });

  it('still deletes a promoted admin left behind after its community was deleted', () => {
    expect(deleteAssociatedUser('ops@planet-b', throwError({ status: 404 }))).toEqual([
      '_users/org.couchdb.user:ops@planet-b?rev=1-user',
      'shelf/org.couchdb.user:ops@planet-b?rev=1-shelf'
    ]);
  });
});

describe('UsersService toggleAdminStatus', () => {
  it('calls demoteFromAdmin when user.isUserAdmin is true', () => {
    const service = new UsersService({} as any, {} as any, { couchStateListener: () => NEVER } as any, {} as any, {} as any);
    const demoteSpy = vi.spyOn(service, 'demoteFromAdmin').mockReturnValue(of({} as any));
    const promoteSpy = vi.spyOn(service, 'promoteToAdmin').mockReturnValue(of({} as any));

    const user = { name: 'adminUser', isUserAdmin: true, roles: [] };
    service.toggleAdminStatus(user);

    expect(demoteSpy).toHaveBeenCalledWith(user);
    expect(promoteSpy).not.toHaveBeenCalled();
  });

  it('calls promoteToAdmin when user.isUserAdmin is false even if roles are empty', () => {
    const service = new UsersService({} as any, {} as any, { couchStateListener: () => NEVER } as any, {} as any, {} as any);
    const demoteSpy = vi.spyOn(service, 'demoteFromAdmin').mockReturnValue(of({} as any));
    const promoteSpy = vi.spyOn(service, 'promoteToAdmin').mockReturnValue(of({} as any));

    const deactivatedUser = { name: 'inactiveUser', isUserAdmin: false, roles: [] };
    service.toggleAdminStatus(deactivatedUser);

    expect(promoteSpy).toHaveBeenCalledWith(deactivatedUser);
    expect(demoteSpy).not.toHaveBeenCalled();
  });
});

