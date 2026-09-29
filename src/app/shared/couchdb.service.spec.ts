import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CouchService } from './couchdb.service';

describe('CouchService 403 alerts', () => {
  const forbidden = { status: 403, error: { error: 'forbidden', reason: 'You are not allowed to access this db.' } };

  const buildService = (get: any) => {
    const http = { get: vi.fn().mockReturnValue(get) };
    const planetMessageService = { showAlert: vi.fn() };
    return { service: new CouchService(http as any, planetMessageService as any), http, planetMessageService };
  };

  it('alerts the user on an unexpected 403', () => {
    const { service, planetMessageService } = buildService(throwError(forbidden));

    service.get('teams').subscribe({ error: () => {} });

    expect(planetMessageService.showAlert).toHaveBeenCalledTimes(1);
  });

  it('leaves an expected 403 to the caller without alerting', () => {
    const { service, planetMessageService } = buildService(throwError(forbidden));
    let error;

    service.get('teams', { suppressMessage: true }).subscribe({ error: (err) => error = err });

    expect(error).toBe(forbidden);
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('keeps suppressMessage out of the HTTP options', () => {
    const { service, http } = buildService(of({}));

    service.get('teams', { suppressMessage: true }).subscribe();

    const [ , opts ] = http.get.mock.calls[0];
    expect(opts.suppressMessage).toBeUndefined();
    expect(opts.withCredentials).toBe(true);
  });
});
