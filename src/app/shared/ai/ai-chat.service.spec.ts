import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';

import { CouchService } from '@shared/database/couchdb.service';
import { AIProvider, ChatStreamMessage } from '../../chat/chat.model';
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

  describe('streamPrompt', () => {
    class FakeSocket {
      static last: FakeSocket;
      sent: string[] = [];
      closed = false;
      onopen: () => void;
      onmessage: (event: { data: string }) => void;
      onclose: () => void;
      constructor() {
        FakeSocket.last = this;
      }
      send(data: string) {
        this.sent.push(data);
      }
      close() {
        this.closed = true;
      }
      frame(message: object) {
        this.onmessage({ data: JSON.stringify(message) });
      }
    }

    const streamTurn = () => {
      vi.stubGlobal('WebSocket', FakeSocket);
      TestBed.configureTestingModule({
        providers: [ { provide: HttpClient, useValue: { get: () => of({ providers: [] }) } } ]
      });
      const turn = { messages: [] as ChatStreamMessage[], error: undefined as Error | undefined, done: false };
      const subscription = TestBed.inject(AiChatService).streamPrompt({ content: 'Hi' }).subscribe({
        next: (message) => {
          turn.messages.push(message);
        },
        error: (error) => {
          turn.error = error;
        },
        complete: () => {
          turn.done = true;
        }
      });
      return { socket: FakeSocket.last, turn, subscription };
    };

    afterEach(() => vi.unstubAllGlobals());

    it('sends the turn once the socket opens and closes the socket after the final frame', () => {
      const { socket, turn } = streamTurn();
      expect(socket.sent).toEqual([]);

      socket.onopen();
      socket.frame({ type: 'partial', response: 'Hel' });
      socket.frame({ type: 'final', completionText: 'Hello', couchDBResponse: { id: 'c1', rev: '1-a' } });

      expect(socket.sent).toEqual([ JSON.stringify({ content: 'Hi' }) ]);
      expect(turn.messages.map(({ type }) => type)).toEqual([ 'partial', 'final' ]);
      expect(turn.done).toBe(true);
      expect(socket.closed).toBe(true);
    });

    it('fails the turn with the gateway error message and closes the socket', () => {
      const { socket, turn } = streamTurn();

      socket.onopen();
      socket.frame({ type: 'error', error: 'This conversation has reached its 40-turn limit; start a new one to continue' });

      expect(turn.error.message).toBe('This conversation has reached its 40-turn limit; start a new one to continue');
      expect(socket.closed).toBe(true);
    });

    it('fails the turn when the socket closes before the final frame', () => {
      const { socket, turn } = streamTurn();

      socket.onclose();

      expect(turn.error.message).toBe('WebSocket connection error');
    });

    it('closes the socket when the turn is cancelled', () => {
      const { socket, subscription } = streamTurn();

      subscription.unsubscribe();

      expect(socket.closed).toBe(true);
    });
  });
});
