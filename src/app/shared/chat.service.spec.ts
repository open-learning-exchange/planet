import { of, throwError } from 'rxjs';
import { afterEach, vi } from 'vitest';

import { AIServices } from '../chat/chat.model';
import { CouchService } from './couchdb.service';
import { ChatService } from './chat.service';

const services = (enabled: Partial<Record<keyof AIServices, boolean>>): AIServices => ({
  'openai': { 'enabled': !!enabled.openai, 'capabilities': [] },
  'perplexity': { 'enabled': !!enabled.perplexity, 'capabilities': [] },
  'deepseek': { 'enabled': !!enabled.deepseek, 'capabilities': [] },
  'gemini': { 'enabled': !!enabled.gemini, 'capabilities': [] }
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

  const createService = (providerResponse = of(services({ 'perplexity': true }))) => {
    const httpClient = {
      'get': vi.fn().mockReturnValue(providerResponse),
      'post': vi.fn(),
      'delete': vi.fn()
    };
    return {
      httpClient,
      'service': new ChatService(httpClient as any, {} as CouchService)
    };
  };

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

    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ 'content': 'hello' }));
  });

  it('opens the production WebSocket through the nginx /ml/ location', () => {
    const { service } = createService();
    const { webSocketMock } = installWebSocketMock();
    (service as any).baseUrl = 'https://planet.example/ml';

    service.initializeWebSocket();

    expect(webSocketMock).toHaveBeenCalledWith('wss://planet.example/ml/');
  });

  it('replaces a closing WebSocket before sending', () => {
    const { service } = createService();
    (service as any).socket = { 'readyState': WebSocket.CLOSING };
    const replacement = { 'readyState': WebSocket.OPEN, 'send': vi.fn() };
    vi.spyOn(service, 'initializeWebSocket').mockImplementation(() => {
      (service as any).socket = replacement;
    });

    service.sendUserInput({ 'content': 'hello' });

    expect(service.initializeWebSocket).toHaveBeenCalled();
    expect(replacement.send).toHaveBeenCalledWith(JSON.stringify({ 'content': 'hello' }));
  });

  it('reports an unexpected socket close once and clears the active socket', () => {
    const { service } = createService();
    const { socket } = installWebSocketMock();
    const errors: string[] = [];
    service.getErrorStream().subscribe((error) => errors.push(error));

    service.initializeWebSocket();
    service.sendUserInput({ 'content': 'hello' });
    socket.onclose();

    expect(errors).toEqual([ 'WebSocket connection closed' ]);
    expect((service as any).socket).toBeUndefined();
  });

  it('silently reconnects on demand after an idle socket closes', () => {
    const { service } = createService();
    const { socket } = installWebSocketMock();
    const errors: string[] = [];
    service.getErrorStream().subscribe((error) => errors.push(error));

    service.initializeWebSocket();
    socket.onclose();

    expect(errors).toEqual([]);
    expect((service as any).socket).toBeUndefined();
  });

  it('does not duplicate a server error when its socket then closes', () => {
    const { service } = createService();
    const { socket, emitMessage } = installWebSocketMock();
    const errors: string[] = [];
    service.getErrorStream().subscribe((error) => errors.push(error));

    service.initializeWebSocket();
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

    service.initializeWebSocket();
    emitMessage(JSON.stringify({
      'type': 'error',
      'code': 'resource_attachments_unsupported',
      'message': 'server-owned English details'
    }));

    expect(errors).toEqual([
      'This AI provider does not support resource attachments. Use OpenAI for attachment questions.'
    ]);
    expect(socket.close).toHaveBeenCalled();
  });

  it('localizes unavailable resource context without exposing gateway text', () => {
    const { service } = createService();

    expect(service.chatErrorMessage({
      'code': 'resource_context_unavailable',
      'message': 'Resource context is unavailable'
    })).toEqual('This resource is unavailable for AI chat. Reload the course step or ask a manager for access.');
  });

  it('closes a streaming socket after its terminal frame', () => {
    const { service } = createService();
    const { socket, emitMessage } = installWebSocketMock();
    const messages: string[] = [];
    service.getChatStream().subscribe((message) => messages.push(message));

    service.initializeWebSocket();
    service.sendUserInput({ 'content': 'hello' });
    emitMessage(JSON.stringify({ 'type': 'final', 'completionText': 'done' }));

    expect(messages).toHaveLength(1);
    expect(socket.close).toHaveBeenCalled();
    expect((service as any).pendingSocket).toBeUndefined();
  });

  it('prefers structured output for survey analysis instead of inheriting the last chat provider', () => {
    const providerResponse = of({
      ...services({ 'openai': true, 'perplexity': true }),
      'openai': { 'enabled': true, 'capabilities': [ 'chat', 'structuredOutput' ] },
      'perplexity': { 'enabled': true, 'capabilities': [ 'chat' ] }
    });
    const { service, httpClient } = createService(providerResponse);
    httpClient.post.mockReturnValue(of({ 'provider': 'openai', 'sections': [] }));
    service.setChatAIProvider({ 'name': 'perplexity' });

    service.analyzeSurvey({ 'exam': { 'name': 'Survey' }, 'questions': [] }).subscribe();

    expect(service.getPreferredAnalysisProvider()).toMatchObject({ 'name': 'openai' });
    expect(httpClient.post.mock.calls[0][1]).toMatchObject({ 'aiProvider': { 'name': 'openai' } });
  });

  it('reports whether an enabled provider supports file search', () => {
    const providerResponse = of({
      ...services({ 'openai': true }),
      'openai': { 'enabled': true, 'capabilities': [ 'chat', 'fileSearch' ] }
    });
    const { service } = createService(providerResponse);

    expect(service.hasFileSearchProvider()).toEqual(true);
  });
});
