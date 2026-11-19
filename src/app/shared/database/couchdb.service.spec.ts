import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { environment } from '../../../environments/environment';
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

describe('CouchService findAll', () => {
  let service: CouchService;
  let http: HttpTestingController;
  const url = environment.couchAddress + '/courses/_find';
  const docs = (count: number) => Array.from({ length: count }, (_, i) => ({ _id: `${i}` }));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ provideHttpClient(), provideHttpClientTesting() ] });
    service = TestBed.inject(CouchService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('stops at a short page without another request', () => {
    let result: any[];
    service.findAll('courses', { selector: {}, limit: 2 }).subscribe(res => result = res);

    http.expectOne(url).flush({ docs: docs(1), bookmark: 'a' });

    expect(result.length).toBe(1);
  });

  it('follows the bookmark after a full page', () => {
    let result: any[];
    service.findAll('courses', { selector: {}, limit: 2 }).subscribe(res => result = res);

    http.expectOne(url).flush({ docs: docs(2), bookmark: 'a' });
    const second = http.expectOne(url);
    second.flush({ docs: docs(2), bookmark: 'b' });
    const third = http.expectOne(url);
    third.flush({ docs: [], bookmark: 'b' });

    expect(second.request.body).toContain('"bookmark":"a"');
    expect(third.request.body).toContain('"bookmark":"b"');
    expect(result.length).toBe(4);
  });

  it('asks for 1000 docs per page when the query has no limit', () => {
    let result: any[];
    service.findAll('courses', { selector: {} }).subscribe(res => result = res);

    const first = http.expectOne(url);
    first.flush({ docs: docs(25), bookmark: 'a' });

    expect(first.request.body).toContain('"limit":1000');
    expect(result.length).toBe(25);
  });

  it('passes a failed first page to the caller', () => {
    let error: any;
    service.findAll('courses', { selector: {}, limit: 2 }).subscribe({ error: err => error = err });

    http.expectOne(url).flush({ error: 'no_usable_index' }, { status: 400, statusText: 'Bad Request' });

    expect(error.status).toBe(400);
  });

  it('passes a failed later page to the caller', () => {
    let error: any;
    service.findAll('courses', { selector: {}, limit: 2 }).subscribe({ error: err => error = err });

    http.expectOne(url).flush({ docs: docs(2), bookmark: 'a' });
    http.expectOne(url).flush({ error: 'timeout' }, { status: 500, statusText: 'Server Error' });

    expect(error.status).toBe(500);
  });
});
