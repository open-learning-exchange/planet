import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { PlanetMessageService } from '@shared/ui/planet-message.service';
import { environment } from '../../../environments/environment';
import { CouchService } from './couchdb.service';

const readText = (blob: Blob) => new Promise<string>((resolve) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as string);
  reader.readAsText(blob);
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

  const putWithFile = async (doc) => {
    couchService.putDocumentWithFiles('resources', doc, { 'a.pdf': file }).subscribe();
    httpMock.expectOne(request => request.url.endsWith('/time')).flush(1000);
    const put = httpMock.expectOne(request => request.method === 'PUT');
    const boundary = put.request.headers.get('Content-Type').match(/^multipart\/related; boundary="(.+)"$/)[1];
    const [ , docPart, ...fileParts ] = (await readText(put.request.body)).split(`--${boundary}`);
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

  it('puts a new doc under one generated id, the same in the URL and the body', async () => {
    const { url, sentDoc } = await putWithFile({ title: 'A' });

    expect(sentDoc._id).toMatch(/^[0-9a-f]{32}$/);
    expect(url).toBe(`${environment.couchAddress}/resources/${sentDoc._id}`);
  });

});
