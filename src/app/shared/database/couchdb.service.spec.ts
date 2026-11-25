import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { environment } from '../../../environments/environment';
import { CouchService } from './couchdb.service';

const readBinaryString = (blob: Blob) => new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String.fromCharCode(...new Uint8Array(reader.result as ArrayBuffer)));
  reader.readAsArrayBuffer(blob);
});

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

describe('CouchService', () => {

  const file = new File([ '%PDF' ], 'a.pdf', { type: 'application/pdf' });
  let couchService: CouchService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ provideHttpClient(), provideHttpClientTesting(), { provide: PlanetMessageService, useValue: {} } ]
    });
    couchService = TestBed.inject(CouchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const putWithFile = async (doc, files: { [name: string]: File } = { 'a.pdf': file }) => {
    couchService.putDocumentWithFiles('resources', doc, files).subscribe();
    httpMock.expectOne(request => request.url.endsWith('/time')).flush(1000);
    const put = httpMock.expectOne(request => request.method === 'PUT');
    const boundary = put.request.headers.get('Content-Type').match(/^multipart\/related; boundary="(.+)"$/)[1];
    const [ , docPart, ...fileParts ] = (await readBinaryString(put.request.body)).split(`--${boundary}`);
    return { url: put.request.url, sentDoc: JSON.parse(docPart.split('\r\n\r\n')[1]), fileParts };
  };

  it('puts the doc, listing its file as follows, ahead of the file\'s bytes in one multipart request', async () => {
    const { url, sentDoc, fileParts } = await putWithFile({ _id: 'res-1', _rev: '1-a', _attachments: {} });

    expect(url).toBe(`${environment.couchAddress}/resources/res-1`);
    expect(sentDoc).toEqual({
      _id: 'res-1', _rev: '1-a', _attachments: { 'a.pdf': { follows: true, content_type: 'application/pdf', length: 4 } }
    });
    expect(fileParts).toEqual([ '\r\n\r\n%PDF\r\n', '--' ]);
  });

  it('sends no part for a kept stub and each new file\'s bytes in the order the doc lists them', async () => {
    const stub = { stub: true, content_type: 'text/html', length: 3, digest: 'md5-x', revpos: 1 };
    const files = {
      'a.css': new File([ new Uint8Array([ 0xff, 0x00, 0x0d ]) ], 'a.css', { type: 'text/css' }),
      'b.png': new File([ new Uint8Array([ 0x89, 0xfe, 0xff, 0x0a ]) ], 'b.png', { type: 'image/png' })
    };

    const { sentDoc, fileParts } = await putWithFile({ _id: 'res-1', _rev: '1-a', _attachments: { 'index.html': stub } }, files);

    expect(Object.keys(sentDoc._attachments)).toEqual([ 'index.html', 'a.css', 'b.png' ]);
    expect(sentDoc._attachments['index.html']).toEqual(stub);
    expect(fileParts).toEqual([ '\r\n\r\n\xff\x00\x0d\r\n', '\r\n\r\n\x89\xfe\xff\x0a\r\n', '--' ]);
  });

  it('puts a new doc under one generated id, the same in the URL and the body', async () => {
    const { url, sentDoc } = await putWithFile({ title: 'A' });

    expect(sentDoc._id).toMatch(/^[0-9a-f]{32}$/);
    expect(url).toBe(`${environment.couchAddress}/resources/${sentDoc._id}`);
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
