import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { LoginTasksService } from './login-tasks.service';

describe('LoginTasksService parent account repair', () => {
  const configuration = {
    _id: 'config-1', planetType: 'community', code: 'planet1', parentDomain: 'nation.org', adminName: 'admin@planet1'
  };
  const registration = { _id: 'request-1', code: 'planet1', registrationRequest: 'accepted' };
  const unauthorized = { status: 401 };

  const buildService = ({
    sessions = [], registrationResult = of({ docs: [ registration ] }), updateDocument = vi.fn().mockReturnValue(of({})),
    registrationRequest = 'accepted'
  }: any) => {
    const couchService = {
      post: vi.fn().mockImplementation((db: string) => db === '_session' ? sessions.shift() : registrationResult),
      updateDocument
    };
    const userService = {
      get: vi.fn().mockReturnValue({
        _id: 'org.couchdb.user:admin', _rev: '1-a', _attachments: { img: { stub: true } }, name: 'admin', roles: [ '_admin' ], type: 'user'
      }),
      credentials: { derived_key: 'key', salt: 'salt', iterations: 10, password_scheme: 'pbkdf2' },
      newSessionLog: vi.fn().mockReturnValue(of({}))
    };
    const syncService = { sync: vi.fn().mockReturnValue(of({})) };
    const planetMessageService = { showMessage: vi.fn() };
    const service = new LoginTasksService(
      couchService as any,
      userService as any,
      { replicateFromRemoteDBs: vi.fn().mockReturnValue([]) } as any,
      syncService as any,
      { configuration: { ...configuration, registrationRequest } } as any,
      { userDatabaseName: vi.fn().mockReturnValue('userdb'), userHealthSecurity: vi.fn().mockReturnValue(of('secured')) } as any,
      { getSubmissions: vi.fn().mockReturnValue(of([])) } as any,
      planetMessageService as any,
      {} as any
    );
    return { service, couchService, syncService, planetMessageService };
  };

  const login = (service: LoginTasksService, name = 'admin') =>
    service.postLoginTasks$(name, 'password', false, 'user-id', configuration).toPromise();
  const writesTo = (couchService: any, db: string) => couchService.updateDocument.mock.calls.filter(([ target ]) => target === db);
  const sessionCalls = (couchService: any) => couchService.post.mock.calls.filter(([ db ]) => db === '_session');

  it('recreates a missing parent account and retries the session after a 401', async () => {
    const { service, couchService, planetMessageService } = buildService({ sessions: [ throwError(unauthorized), of({ ok: true }) ] });

    await login(service);

    expect(couchService.post).toHaveBeenCalledWith(
      'communityregistrationrequests/_find', expect.anything(), { domain: 'nation.org', withCredentials: false }
    );
    const [ [ , parentUser, opts ] ] = writesTo(couchService, '_users');
    expect(parentUser).toMatchObject({
      _id: 'org.couchdb.user:admin@planet1', name: 'admin@planet1', requestId: 'request-1', type: 'user',
      isUserAdmin: false, roles: [ 'learner' ], derived_key: 'key', salt: 'salt', iterations: 10, password_scheme: 'pbkdf2'
    });
    expect(parentUser._rev).toBeUndefined();
    expect(parentUser._attachments).toBeUndefined();
    expect(opts).toEqual({ domain: 'nation.org', withCredentials: false, suppressMessage: true });
    const sessionOpts = { withCredentials: true, domain: 'nation.org' };
    expect(sessionCalls(couchService).map(([ , , callOpts ]) => callOpts)).toEqual([ sessionOpts, sessionOpts ]);
    expect(planetMessageService.showMessage).not.toHaveBeenCalled();
  });

  it('leaves a pending registration\'s account without roles until the nation accepts it', async () => {
    const { service, couchService } = buildService({
      sessions: [ throwError(unauthorized), of({ ok: true }) ],
      registrationResult: of({ docs: [ { ...registration, registrationRequest: 'pending' } ] })
    });

    await login(service);

    const writes = writesTo(couchService, '_users');
    expect(writes.map(([ , user ]) => user.roles)).toEqual([ [] ]);
    expect(writes[0][1].requestId).toBe('request-1');
  });

  it('repairs only the registered admin\'s parent account', async () => {
    const { service, couchService, planetMessageService } = buildService({ sessions: [ throwError(unauthorized) ] });

    await login(service, 'ops');

    expect(couchService.post).toHaveBeenCalledTimes(1);
    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(planetMessageService.showMessage).toHaveBeenCalledWith(expect.stringContaining('Can not login'));
  });

  it('falls back to a role-less account when the parent refuses the learner role', async () => {
    const updateDocument = vi.fn().mockReturnValueOnce(throwError({ status: 403 })).mockReturnValueOnce(of({}));
    const { service, couchService } = buildService({ sessions: [ throwError(unauthorized), of({ ok: true }) ], updateDocument });

    await login(service);

    const writes = writesTo(couchService, '_users');
    expect(writes.map(([ , user ]) => user.roles)).toEqual([ [ 'learner' ], [] ]);
    expect(writes[1][2].suppressMessage).toBe(true);
    expect(sessionCalls(couchService)).toHaveLength(2);
  });

  it('reports the rejected login and leaves an existing parent account alone', async () => {
    const { service, couchService, planetMessageService } = buildService({
      sessions: [ throwError(unauthorized) ], updateDocument: vi.fn().mockReturnValue(throwError({ status: 409 }))
    });

    await login(service);

    expect(writesTo(couchService, '_users')).toHaveLength(1);
    expect(sessionCalls(couchService)).toHaveLength(1);
    expect(planetMessageService.showMessage).toHaveBeenCalledWith(expect.stringContaining('Can not login'));
  });

  it('creates nothing when the registration lookup fails', async () => {
    const { service, couchService, planetMessageService } = buildService({
      sessions: [ throwError(unauthorized) ], registrationResult: throwError({ status: 0 })
    });

    await login(service);

    expect(couchService.updateDocument).not.toHaveBeenCalled();
    expect(planetMessageService.showMessage).toHaveBeenCalledWith(expect.stringContaining('Can not login'));
  });

  it('creates nothing without a registration request on the parent', async () => {
    const { service, couchService } = buildService({ sessions: [ throwError(unauthorized) ], registrationResult: of({ docs: [] }) });

    await login(service);

    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('still pulls a pending registration down without a parent session, reporting the failed login', async () => {
    const { service, syncService, planetMessageService } = buildService({
      sessions: [ throwError(unauthorized) ],
      updateDocument: vi.fn().mockReturnValue(throwError({ status: 409 })),
      registrationRequest: 'pending'
    });

    await login(service);

    expect(syncService.sync).toHaveBeenCalledOnce();
    expect(planetMessageService.showMessage).toHaveBeenCalledWith(expect.stringContaining('Can not login'));
  });

  it('leaves a working parent session alone', async () => {
    const { service, couchService } = buildService({ sessions: [ of({ ok: true }) ] });

    await login(service);

    expect(couchService.post).toHaveBeenCalledTimes(1);
    expect(couchService.updateDocument).not.toHaveBeenCalled();
  });

  it('pulls a pending registration down only once the parent session exists', async () => {
    const order: string[] = [];
    const sessions = [ throwError(unauthorized), of({ ok: true }) ];
    const { service, couchService, syncService } = buildService({ registrationRequest: 'pending' });
    couchService.post.mockImplementation((db: string) => {
      if (db !== '_session') {
        return of({ docs: [ registration ] });
      }
      order.push('session');
      return sessions.shift();
    });
    syncService.sync.mockImplementation(() => {
      order.push('sync');
      return of({});
    });

    await login(service);

    expect(order).toEqual([ 'session', 'session', 'sync' ]);
  });
});

describe('LoginTasksService', () => {
  it('continues post-login tasks when no local databases are registered', async () => {
    const userService = {
      get: vi.fn().mockReturnValue({ roles: [] }),
      newSessionLog: vi.fn().mockReturnValue(of({}))
    };
    const submissionsService = { getSubmissions: vi.fn().mockReturnValue(of([])) };
    const healthService = {
      userDatabaseName: vi.fn().mockReturnValue('userdb-test'),
      userHealthSecurity: vi.fn().mockReturnValue(of('secured'))
    };
    const service = new LoginTasksService(
      {} as any,
      userService as any,
      { replicateFromRemoteDBs: vi.fn().mockReturnValue([]) } as any,
      {} as any,
      { configuration: { planetType: 'community' } } as any,
      healthService as any,
      submissionsService as any,
      {} as any,
      {} as any
    );

    await expect(service.postLoginTasks$('tester', 'password', false, 'user-id', { adminName: 'admin@planet' }).toPromise())
      .resolves.toBe('secured');
    expect(userService.newSessionLog).toHaveBeenCalledOnce();
    expect(submissionsService.getSubmissions).toHaveBeenCalledOnce();
    expect(healthService.userHealthSecurity).toHaveBeenCalledWith('userdb-test');
  });
});
