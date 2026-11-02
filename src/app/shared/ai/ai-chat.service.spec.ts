import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, Subject } from 'rxjs';

import { CouchService } from '@shared/database/couchdb.service';
import { StateService } from '@shared/state.service';
import { AIProvider } from '../../chat/chat.model';
import { AiChatService } from './ai-chat.service';

describe('AiChatService', () => {
  let configurations$: Subject<void>;
  let stateService: { configuration: { chatEnabled?: boolean }, couchStateListener: () => Subject<void> };
  let emissions: AIProvider[][];

  const refreshConfiguration = (configuration: { chatEnabled?: boolean }) => {
    stateService.configuration = configuration;
    configurations$.next();
  };

  beforeEach(() => {
    configurations$ = new Subject<void>();
    stateService = { configuration: {}, couchStateListener: () => configurations$ };
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { get: () => of({ openai: true, gemini: false }) } },
        { provide: CouchService, useValue: {} },
        { provide: StateService, useValue: stateService }
      ]
    });
    emissions = [];
    TestBed.inject(AiChatService).listAIProviders().subscribe((providers) => emissions.push(providers));
  });

  it('empties the providers while chat is off and restores them when it comes back on', () => {
    refreshConfiguration({ chatEnabled: false });
    expect(emissions[emissions.length - 1]).toEqual([]);

    refreshConfiguration({ chatEnabled: true });
    expect(emissions[emissions.length - 1]).toEqual([ { name: 'openai', model: 'openai' } ]);
  });

  it('does not re-emit the providers when a refresh leaves the flag unchanged', () => {
    refreshConfiguration({});
    const emitted = emissions.length;

    refreshConfiguration({});
    refreshConfiguration({ chatEnabled: true });

    expect(emissions.length).toEqual(emitted);
  });
});
