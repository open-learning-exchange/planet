import { of, Subject, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';

import { AIProvider, AIServices, AIServiceDiscovery, PromptProfiles } from '../chat/chat.model';
import { CouchService } from './couchdb.service';
import { ChatService } from './chat.service';

const services = (enabled: Partial<Record<keyof AIServices, boolean>>): AIServices => ({
  'openai': { 'enabled': !!enabled.openai, 'capabilities': [], 'fileSearchContentTypes': [] },
  'perplexity': { 'enabled': !!enabled.perplexity, 'capabilities': [], 'fileSearchContentTypes': [] },
  'deepseek': { 'enabled': !!enabled.deepseek, 'capabilities': [], 'fileSearchContentTypes': [] },
  'gemini': { 'enabled': !!enabled.gemini, 'capabilities': [], 'fileSearchContentTypes': [] }
});

const promptDefaults: PromptProfiles = {
  'general_chat': 'GENERAL DEFAULT',
  'course_help': 'COURSE DEFAULT',
  'survey_analysis': 'SURVEY DEFAULT'
};

const discovery = (enabled: Partial<Record<keyof AIServices, boolean>>): AIServiceDiscovery => ({
  'providers': services(enabled),
  promptDefaults
});

const installWebSocketMock = () => {
  let messageHandler: ((event: { data: string }) => void) | undefined;
  const socket: any = {
    'readyState': WebSocket.OPEN,
    'send': vi.fn(),
    'close': vi.fn(),
    'addEventListener': vi.fn((event: string, handler: (event: { data: string }) => void) => {
      if (event === 'message') {
        messageHandler = handler;
      }
    })
  };
  const webSocketMock: any = vi.fn(() => socket);
  webSocketMock.CONNECTING = WebSocket.CONNECTING;
  webSocketMock.OPEN = WebSocket.OPEN;
  webSocketMock.CLOSING = WebSocket.CLOSING;
  webSocketMock.CLOSED = WebSocket.CLOSED;
  vi.stubGlobal('WebSocket', webSocketMock);
  return {
    socket,
    webSocketMock,
    'emitMessage': (data: string) => {
      if (!messageHandler) {
        throw new Error('WebSocket message handler is not registered');
      }
      messageHandler({ data });
    }
  };
};

describe('ChatService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createService = (providerResponse = of(discovery({ 'perplexity': true })), locale = 'en') => {
    const httpClient = {
      'get': vi.fn().mockReturnValue(providerResponse),
      'post': vi.fn(),
      'delete': vi.fn()
    };
    return {
      httpClient,
      'service': new ChatService(httpClient as any, {} as CouchService, locale)
    };
  };

  describe('provider discovery and selection', () => {
    it('loads provider discovery only when an authenticated consumer needs it', () => {
      const { service, httpClient } = createService();

      expect(httpClient.get).not.toHaveBeenCalled();
      service.getAIServiceDiscovery().subscribe();

      expect(httpClient.get).toHaveBeenCalledTimes(1);
    });

    // A pending discovery must not look like a failed one, or the manager form flashes an error
    // banner on every load.
    it('separates a pending discovery from one that failed', () => {
      const pending = new Subject<AIServiceDiscovery>();
      const { service } = createService(pending);
      const states: Array<AIServiceDiscovery | null | undefined> = [];
      service.getAIServiceDiscovery().subscribe((value) => states.push(value));

      expect(states).toEqual([ undefined ]);

      pending.next(discovery({ 'perplexity': true }));

      expect(states.at(-1)).toEqual(discovery({ 'perplexity': true }));
    });

    it('does not emit a stale discovery before a queued forced refresh', () => {
      const pending = new Subject<AIServiceDiscovery>();
      const httpClient = {
        'get': vi.fn()
          .mockReturnValueOnce(pending)
          .mockReturnValueOnce(of(discovery({ 'openai': true })))
      };
      const service = new ChatService(httpClient as any, {} as CouchService, 'en');
      const states: Array<AIServiceDiscovery | null | undefined> = [];
      service.getAIServiceDiscovery().subscribe((value) => states.push(value));
      expect(httpClient.get).toHaveBeenCalledTimes(1);

      service.refreshAIProviders();

      expect(httpClient.get).toHaveBeenCalledTimes(1);

      pending.next(discovery({ 'perplexity': true }));

      expect(httpClient.get).toHaveBeenCalledTimes(2);
      expect(states).toEqual([ undefined, discovery({ 'openai': true }) ]);
    });

    it('reports a failed discovery instead of holding consumers at pending', () => {
      const { service } = createService(throwError({ 'status': 503 }));
      const states: Array<AIServiceDiscovery | null | undefined> = [];

      service.getAIServiceDiscovery().subscribe((value) => states.push(value));

      expect(states).toEqual([ null ]);
    });

    it('retries an initial failed discovery after a short backoff', () => {
      vi.useFakeTimers();
      try {
        const httpClient = {
          'get': vi.fn()
            .mockReturnValueOnce(throwError({ 'status': 503 }))
            .mockReturnValueOnce(of(discovery({ 'perplexity': true })))
        };
        const service = new ChatService(httpClient as any, {} as CouchService, 'en');

        service.getAIServiceDiscovery().subscribe();
        expect(httpClient.get).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(5000);
        service.getAIServiceDiscovery().subscribe();

        expect(httpClient.get).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('retains the last provider list when a refresh fails', () => {
      const { service, httpClient } = createService();
      const providerLists: string[][] = [];
      service.listAIProviders().subscribe((providers) => providerLists.push(providers.map((provider) => provider.name)));
      httpClient.get.mockReturnValueOnce(throwError({ 'status': 503 }));

      service.refreshAIProviders();

      expect(providerLists.at(-1)).toEqual([ 'perplexity' ]);
    });

    it('replays provider selection to late chat-window subscribers', () => {
      const { service } = createService();
      service.toggleAIServiceSignal('gemini');
      const selected: string[] = [];

      service.toggleAIService$.subscribe((provider) => selected.push(provider));

      expect(selected).toEqual([ 'gemini' ]);
    });
  });

  describe('WebSocket transport and errors', () => {
    it('queues a submission until a connecting WebSocket opens', () => {
      const { service } = createService();
      let openHandler: () => void;
      const socket = {
        'readyState': WebSocket.CONNECTING,
        'send': vi.fn(),
        'addEventListener': vi.fn((event: string, handler: () => void) => {
          if (event === 'open') {
            openHandler = handler;
          }
        })
      };
      (service as any).socket = socket;

      service.sendUserInput({ 'content': 'hello' });
      expect(socket.send).not.toHaveBeenCalled();
      socket.readyState = WebSocket.OPEN;
      openHandler();

      expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ 'content': 'hello', 'locale': 'en' }));
    });

    it('opens the production WebSocket through the nginx /ml/ location', () => {
      const { service } = createService();
      const { socket, webSocketMock } = installWebSocketMock();
      (service as any).baseUrl = 'https://planet.example/ml';

      service.sendUserInput({ 'content': 'hello' });

      expect(webSocketMock).toHaveBeenCalledWith('wss://planet.example/ml/');
      expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ 'content': 'hello', 'locale': 'en' }));
    });

    it('replaces a closing WebSocket before sending', () => {
      const { service } = createService();
      const { socket: replacement, webSocketMock } = installWebSocketMock();
      (service as any).socket = { 'readyState': WebSocket.CLOSING };

      service.sendUserInput({ 'content': 'hello' });

      expect(webSocketMock).toHaveBeenCalledOnce();
      expect(replacement.send).toHaveBeenCalledWith(JSON.stringify({ 'content': 'hello', 'locale': 'en' }));
    });

    it('reports an unexpected socket close once and clears the active socket', () => {
      const { service } = createService();
      const { socket } = installWebSocketMock();
      const errors: string[] = [];
      service.getErrorStream().subscribe((error) => errors.push(error));

      service.sendUserInput({ 'content': 'hello' });
      socket.onclose();

      expect(errors).toEqual([ 'WebSocket connection closed' ]);
      expect((service as any).socket).toBeUndefined();
    });

    it('does not duplicate a server error when its socket then closes', () => {
      const { service } = createService();
      const { socket, emitMessage } = installWebSocketMock();
      const errors: string[] = [];
      service.getErrorStream().subscribe((error) => errors.push(error));

      service.sendUserInput({ 'content': 'hello' });
      emitMessage(JSON.stringify({ 'type': 'error', 'message': 'Session expired' }));
      socket.onclose();

      expect(errors).toEqual([ 'Session expired' ]);
      expect(socket.close).toHaveBeenCalled();
    });

    it('maps structured gateway errors to client-localizable messages', () => {
      const { service } = createService();
      const { socket, emitMessage } = installWebSocketMock();
      const errors: string[] = [];
      service.getErrorStream().subscribe((error) => errors.push(error));

      service.sendUserInput({ 'content': 'hello' });
      emitMessage(JSON.stringify({
        'type': 'error',
        'code': 'resource_attachments_unsupported',
        'message': 'server-owned English details'
      }));

      expect(errors).toEqual([
        'This AI provider does not support resource attachments. Select a provider that does.'
      ]);
      expect(socket.close).toHaveBeenCalled();
    });

    it('closes a streaming socket after its terminal frame', () => {
      const { service } = createService();
      const { socket, emitMessage } = installWebSocketMock();
      const messages: any[] = [];
      service.getChatStream().subscribe((message) => messages.push(message));

      service.sendUserInput({ 'content': 'hello' });
      emitMessage(JSON.stringify({ 'type': 'final', 'completionText': 'done' }));

      expect(messages).toEqual([ { 'type': 'final', 'completionText': 'done' } ]);
      expect(socket.close).toHaveBeenCalled();
      expect((service as any).pendingSocket).toBeUndefined();
    });
  });

  describe('error messages', () => {
    it('localizes unavailable resource context without exposing gateway text', () => {
      const { service } = createService();

      expect(service.chatErrorMessage({
        'code': 'resource_context_unavailable',
        'message': 'Resource context is unavailable'
      })).toEqual('This resource is unavailable for AI chat. Reload the course step or ask a manager for access.');
    });
  });

  describe('provider-specific requests', () => {
    it('prefers structured output for survey analysis instead of inheriting the last chat provider', () => {
      const providerResponse = of({
        'providers': {
          ...services({ 'openai': true, 'perplexity': true }),
          'openai': { 'enabled': true, 'capabilities': [ 'chat', 'structuredOutput' ], 'fileSearchContentTypes': [] },
          'perplexity': { 'enabled': true, 'capabilities': [ 'chat' ], 'fileSearchContentTypes': [] }
        },
        promptDefaults
      });
      const { service, httpClient } = createService(providerResponse);
      httpClient.post.mockReturnValue(of({ 'provider': 'openai', 'sections': [] }));
      service.listAIProviders().subscribe();
      service.setChatAIProvider({ 'name': 'perplexity' });

      service.analyzeSurvey({ 'exam': { 'name': 'Survey' }, 'questions': [] }).subscribe();

      expect(service.getPreferredAnalysisProvider()).toMatchObject({ 'name': 'openai' });
      expect(httpClient.post.mock.calls[0][1]).toMatchObject({
        'aiProvider': { 'name': 'openai' },
        'locale': 'en'
      });
    });

    it('exposes gateway file-search metadata for enabled providers', () => {
      const providerResponse = of({
        'providers': {
          ...services({ 'openai': true }),
          'openai': {
            'label': 'OpenAI',
            'enabled': true,
            'capabilities': [ 'chat', 'fileSearch' ],
            'fileSearchContentTypes': [ 'application/pdf' ]
          }
        },
        promptDefaults
      });
      const { service } = createService(providerResponse);
      let providers: AIProvider[] = [];
      let defaults: PromptProfiles | undefined;
      service.listAIProviders().subscribe((value) => providers = value);
      service.getAIServiceDiscovery().subscribe((value) => defaults = value?.promptDefaults);

      expect(service.hasFileSearchProvider()).toEqual(true);
      expect(providers).toEqual([ {
        'name': 'openai',
        'label': 'OpenAI',
        'capabilities': [ 'chat', 'fileSearch' ],
        'fileSearchContentTypes': [ 'application/pdf' ]
      } ]);
      expect(defaults).toEqual(promptDefaults);
    });
  });
});
