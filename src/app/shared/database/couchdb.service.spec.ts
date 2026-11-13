import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../environments/environment';
import { CouchService } from './couchdb.service';

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
