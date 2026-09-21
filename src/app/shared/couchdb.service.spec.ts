import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CouchService } from './couchdb.service';

describe('CouchService parent request bounds', () => {
  afterEach(() => vi.useRealTimers());

  const buildService = (httpOverrides: any = {}) => {
    const http = { get: vi.fn().mockReturnValue(NEVER), ...httpOverrides };
    return { service: new CouchService(http as any, { showAlert: vi.fn() } as any), http };
  };

  it('fails a parent request that never answers', () => {
    vi.useFakeTimers();
    const { service } = buildService();
    let error;

    service.get('_users/org.couchdb.user:alex', { domain: 'nation.org' }).subscribe({ error: (err) => error = err });
    expect(error).toBeUndefined();

    vi.advanceTimersByTime(30 * 1000);

    expect(error).toEqual({ status: 0, error: { reason: 'timeout' } });
  });

  it('leaves local requests unbounded', () => {
    vi.useFakeTimers();
    const { service } = buildService();
    let error;

    service.get('_users/org.couchdb.user:alex').subscribe({ error: (err) => error = err });
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(error).toBeUndefined();
  });

  it('bounds getUrl, which does not go through the shared request path', () => {
    vi.useFakeTimers();
    const { service } = buildService();
    let error;

    service.getUrl('version', { domain: 'nation.org' }).subscribe({ error: (err) => error = err });
    vi.advanceTimersByTime(30 * 1000);

    expect(error).toEqual({ status: 0, error: { reason: 'timeout' } });
  });

  it('lets a caller lengthen the bound for a long parent operation', () => {
    vi.useFakeTimers();
    const { service } = buildService();
    let error;

    service.get('send_items/_all_docs', { domain: 'nation.org', timeout: 60 * 1000 })
      .subscribe({ error: (err) => error = err });
    vi.advanceTimersByTime(30 * 1000);
    expect(error).toBeUndefined();

    vi.advanceTimersByTime(30 * 1000);
    expect(error).toEqual({ status: 0, error: { reason: 'timeout' } });
  });

  it('lets a caller lift the bound for a long parent operation', () => {
    vi.useFakeTimers();
    const { service } = buildService();
    let error;

    service.get('send_items/_all_docs', { domain: 'nation.org', timeout: 0 }).subscribe({ error: (err) => error = err });
    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(error).toBeUndefined();
  });
});

describe('CouchService find pagination', () => {
  const buildService = (post: any) =>
    new CouchService({ post } as any, { showAlert: vi.fn() } as any);

  it('reports a failed first page to findAllStream', () => {
    const service = buildService(vi.fn().mockReturnValue(throwError({ status: 0, error: { reason: 'timeout' } })));
    let error;

    service.findAllStream('courses', undefined, { domain: 'nation.org' }).subscribe({ error: (err) => error = err });

    expect(error).toEqual({ status: 0, error: { reason: 'timeout' } });
  });

  it('still returns an empty result to findAll, whose callers have not been surveyed yet', () => {
    const service = buildService(vi.fn().mockReturnValue(throwError({ status: 0, error: { reason: 'timeout' } })));
    let docs;
    let error;

    service.findAll('courses', undefined, { domain: 'nation.org' })
      .subscribe({ next: (res) => docs = res, error: (err) => error = err });

    expect(docs).toEqual([]);
    expect(error).toBeUndefined();
  });

  it('does not return a partial findAll result when a later page fails', () => {
    const post = vi.fn()
      .mockReturnValueOnce(of({ docs: [ { _id: 'course-1' } ], bookmark: 'page-2' }))
      .mockReturnValueOnce(throwError({ status: 0, error: { reason: 'timeout' } }));
    const service = buildService(post);
    let docs;
    let error;

    service.findAll('courses').subscribe({ next: (res) => docs = res, error: (err) => error = err });

    expect(docs).toBeUndefined();
    expect(error).toEqual({ status: 0, error: { reason: 'timeout' } });
  });
});

describe('CouchService authorization alerts', () => {
  const buildService = (httpOverrides: any = {}) => {
    const planetMessageService = { showAlert: vi.fn() };
    const http = {
      get: vi.fn().mockReturnValue(throwError({ status: 403 })),
      post: vi.fn().mockReturnValue(throwError({ status: 403 })),
      ...httpOverrides
    };
    return { service: new CouchService(http as any, planetMessageService as any), http, planetMessageService };
  };

  it('alerts the user when a 403 is unexpected', () => {
    const { service, planetMessageService } = buildService();

    service.get('_users/org.couchdb.user:alex').subscribe({ error: () => {} });

    expect(planetMessageService.showAlert).toHaveBeenCalledTimes(1);
  });

  it('leaves an expected 403 to the caller', () => {
    const { service, planetMessageService } = buildService();

    service.post('_users', {}, { domain: 'nation.org', withCredentials: false, suppressMessage: true })
      .subscribe({ error: () => {} });

    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('answers false for a forbidden database without erroring or alerting', () => {
    const { service, planetMessageService } = buildService({
      get: vi.fn().mockReturnValue(throwError({
        status: 403, error: { error: 'forbidden', reason: 'You are not allowed to access this db.' }
      }))
    });
    let authorized;
    let errored = false;

    service.checkAuthorization('resources').subscribe({ next: (res) => authorized = res, error: () => errored = true });

    expect(authorized).toBe(false);
    expect(errored).toBe(false);
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('keeps suppressMessage out of the request options', () => {
    const { service, http } = buildService();

    service.get('_users/org.couchdb.user:alex', { domain: 'nation.org', suppressMessage: true })
      .subscribe({ error: () => {} });

    const [ , opts ] = http.get.mock.calls[0];
    expect(opts.suppressMessage).toBeUndefined();
    expect(opts.withCredentials).toBe(true);
  });

  it('only suppresses the authorization alert, not other failures', () => {
    const { service, planetMessageService } = buildService({
      get: vi.fn().mockReturnValue(throwError({ status: 409 }))
    });
    let error;

    service.get('tablet_users/org.couchdb.user:alex', { suppressMessage: true }).subscribe({ error: (err) => error = err });

    expect(error).toEqual({ status: 409 });
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });
});
