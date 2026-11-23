import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';

import { CouchService } from '@shared/database/couchdb.service';
import { AiChatService } from './ai-chat.service';

describe('AiChatService', () => {
  const openai = { name: 'openai', label: 'OpenAI', configured: true };
  const gemini = { name: 'gemini', label: 'Gemini', configured: false };

  const createService = (...answers: Observable<unknown>[]) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { get: () => answers.shift() } },
        { provide: CouchService, useValue: {} }
      ]
    });
    return TestBed.inject(AiChatService);
  };

  const latest = <T>(source: Observable<T>): T => {
    let value: T;
    source.subscribe(next => value = next).unsubscribe();
    return value;
  };

  it('offers only the providers the gateway reports as configured', () => {
    const service = createService(of({ providers: [ openai, gemini ] }));

    expect(latest(service.listAIProviders())).toEqual([ openai ]);
  });

  it('reports an error or an older gateway\'s answer as failed, not as no providers, until a refresh succeeds', () => {
    const service = createService(throwError(() => new Error('Bad Gateway')), of({ openai: true }), of({ providers: [ openai, gemini ] }));
    expect(latest(service.providerDiscovery$)).toEqual({ state: 'failed' });

    service.refreshAIProviders();
    expect(latest(service.providerDiscovery$)).toEqual({ state: 'failed' });

    service.refreshAIProviders();
    expect(latest(service.providerDiscovery$)).toEqual({ state: 'loaded', providers: [ openai, gemini ] });
  });

  it('cancels the request a refresh replaces, so its late failure is ignored', () => {
    const older = new Subject<unknown>();
    const service = createService(older, of({ providers: [ openai ] }));

    service.refreshAIProviders();
    older.error(new Error('Bad Gateway'));

    expect(older.observed).toBe(false);
    expect(latest(service.providerDiscovery$)).toEqual({ state: 'loaded', providers: [ openai ] });
  });
});
