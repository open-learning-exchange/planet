import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { CouchService } from '@shared/database/couchdb.service';
import { AIProvider } from '../../chat/chat.model';
import { AiChatService } from './ai-chat.service';

describe('AiChatService', () => {
  const offeredProviders = (response: Observable<unknown>) => {
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { get: () => response } },
        { provide: CouchService, useValue: {} }
      ]
    });
    let providers: AIProvider[] = [];
    TestBed.inject(AiChatService).listAIProviders().subscribe(list => providers = list);
    return providers;
  };

  it('offers only the providers the gateway reports as configured', () => {
    const openai = { name: 'openai', label: 'OpenAI', configured: true };
    const gemini = { name: 'gemini', label: 'Gemini', configured: false };

    expect(offeredProviders(of({ providers: [ openai, gemini ] }))).toEqual([ openai ]);
  });

  it('offers none when a gateway answers in another shape', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(offeredProviders(of({ openai: true }))).toEqual([]);
    expect(logged).toHaveBeenCalled();
  });
});
