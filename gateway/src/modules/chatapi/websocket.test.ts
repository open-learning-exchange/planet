import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebSocket from 'ws';

const mocks = vi.hoisted(() => ({
  'chat': vi.fn()
}));

vi.mock('../../config/couch.config', () => ({ 'couchBaseUrl': 'http://couchdb:5984' }));
vi.mock('./services/chat.service', () => ({ 'chat': mocks.chat }));

import { resetRateLimiter } from './middleware/rate-limit';
import { HttpError } from './utils/http-error';
import { registerChatApiWebSocket } from './websocket';

const connect = async (headers: Record<string, string | undefined>) => {
  const wss: any = { 'on': vi.fn() };
  registerChatApiWebSocket(wss);
  const onConnection = wss.on.mock.calls[0][1];
  const ws: any = { 'readyState': WebSocket.OPEN, 'send': vi.fn(), 'close': vi.fn(), 'on': vi.fn() };
  await onConnection(ws, { headers, 'socket': { 'remoteAddress': '10.0.0.9' } });
  return ws;
};

const messageHandler = (ws: any) => ws.on.mock.calls.find((call: any[]) => call[0] === 'message')?.[1];
describe('chatapi WebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiter();
    process.env.CHATAPI_AUTH = 'none';
    mocks.chat.mockResolvedValue({ 'completionText': 'ok', 'citations': [], 'couchSaveResponse': { 'ok': true } });
  });

  afterEach(() => {
    delete process.env.CHATAPI_AUTH;
    delete process.env.CORS_ORIGINS;
    delete process.env.RATE_LIMIT_PER_MINUTE;
    delete process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE;
    delete process.env.TRUST_PROXY_CLIENT_IP;
    vi.unstubAllGlobals();
  });

  it('refuses cross-origin browser connections', async () => {
    const ws = await connect({ 'origin': 'http://evil.test', 'host': 'planet.local:5000' });
    expect(JSON.parse(ws.send.mock.calls[0][0])).toMatchObject({ 'type': 'error', 'error': 'Forbidden' });
    expect(ws.close).toHaveBeenCalledWith(1008, 'Origin not allowed');
    expect(ws.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(messageHandler(ws)).toBeUndefined();
  });

  it('handles transport errors before authentication can complete', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ws = await connect({ 'host': 'planet.local:5000' });
    const onError = ws.on.mock.calls.find((call: any[]) => call[0] === 'error')[1];

    expect(() => onError(new Error('Max payload size exceeded'))).not.toThrow();
    expect(log).toHaveBeenCalledWith('chatapi: WebSocket transport error: Max payload size exceeded');
    log.mockRestore();
  });

  it('accepts same-host origins and origins from CORS_ORIGINS', async () => {
    const sameHost = await connect({ 'origin': 'http://planet.local:5000', 'host': 'planet.local:5000' });
    expect(sameHost.close).not.toHaveBeenCalled();
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    const configured = await connect({ 'origin': 'http://localhost:3000', 'host': 'planet.local:5000' });
    expect(configured.close).not.toHaveBeenCalled();
  });

  it('accepts non-browser clients that send no Origin', async () => {
    const ws = await connect({ 'host': 'planet.local:5000' });
    expect(ws.close).not.toHaveBeenCalled();
    expect(messageHandler(ws)).toBeDefined();
  });

  it('expires an authenticated socket that never submits its single turn', async () => {
    vi.useFakeTimers();
    try {
      const ws = await connect({ 'host': 'planet.local:5000' });

      await vi.advanceTimersByTimeAsync(30000);

      expect(JSON.parse(ws.send.mock.calls.at(-1)[0])).toMatchObject({
        'type': 'error', 'error': 'Unauthorized', 'message': 'Chat request was not received in time'
      });
      expect(ws.close).toHaveBeenCalledWith(1008, 'Chat request timed out');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rate-limits chat turns on the shared chat window', async () => {
    process.env.RATE_LIMIT_PER_MINUTE = '2';
    let lastSocket: any;
    for (let i = 0; i < 3; i++) {
      lastSocket = await connect({ 'host': 'planet.local:5000' });
      await messageHandler(lastSocket)(JSON.stringify({ 'content': 'hi' }));
    }
    expect(mocks.chat).toHaveBeenCalledTimes(2);
    const lastFrame = JSON.parse(lastSocket.send.mock.calls.at(-1)[0]);
    expect(lastFrame).toMatchObject({ 'type': 'error', 'error': 'Too Many Requests' });
  });

  it('rate-limits WebSocket handshakes before session validation', async () => {
    process.env.PRE_AUTH_RATE_LIMIT_PER_MINUTE = '1';

    const first = await connect({ 'host': 'planet.local:5000' });
    const second = await connect({ 'host': 'planet.local:5000' });

    expect(first.close).not.toHaveBeenCalledWith(1013, 'Rate limit exceeded');
    expect(second.close).toHaveBeenCalledWith(1013, 'Rate limit exceeded');
    expect(JSON.parse(second.send.mock.calls.at(-1)[0])).toMatchObject({
      'type': 'error', 'error': 'Too Many Requests'
    });
  });

  it('contains session-validation outages during the WebSocket handshake', async () => {
    delete process.env.CHATAPI_AUTH;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('couch unavailable')));
    const ws = await connect({ 'host': 'planet.local:5000', 'cookie': 'AuthSession=abc' });

    expect(JSON.parse(ws.send.mock.calls[0][0])).toMatchObject({
      'type': 'error',
      'error': 'Service Unavailable'
    });
    expect(ws.close).toHaveBeenCalled();
    expect(ws.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function));
  });

  it('rejects a missing session cookie without querying CouchDB', async () => {
    delete process.env.CHATAPI_AUTH;
    process.env.RATE_LIMIT_PER_MINUTE = '1';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const first = await connect({ 'host': 'planet.local:5000' });
    const second = await connect({ 'host': 'planet.local:5000' });

    expect(first.close).toHaveBeenCalledWith(1008, 'Session expired');
    expect(second.close).toHaveBeenCalledWith(1008, 'Session expired');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounds concurrent WebSocket session validation', async () => {
    delete process.env.CHATAPI_AUTH;
    const resolvers: Array<(value: any) => void> = [];
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise((resolve) => {
      resolvers.push(resolve);
    })));
    const wss: any = { 'on': vi.fn() };
    registerChatApiWebSocket(wss);
    const onConnection = wss.on.mock.calls[0][1];
    const connections: Array<Promise<void>> = [];
    for (let index = 0; index < 8; index++) {
      const ws: any = { 'readyState': WebSocket.OPEN, 'send': vi.fn(), 'close': vi.fn(), 'on': vi.fn() };
      connections.push(onConnection(ws, {
        'headers': { 'host': 'planet.local:5000', 'cookie': `AuthSession=${index}` },
        'socket': { 'remoteAddress': `10.0.0.${index}` }
      }));
    }
    await vi.waitFor(() => expect(resolvers).toHaveLength(8));

    const rejected: any = { 'readyState': WebSocket.OPEN, 'send': vi.fn(), 'close': vi.fn(), 'on': vi.fn() };
    await onConnection(rejected, {
      'headers': { 'host': 'planet.local:5000', 'cookie': 'AuthSession=overflow' },
      'socket': { 'remoteAddress': '10.0.0.99' }
    });

    expect(rejected.close).toHaveBeenCalledWith(1013, 'Session validation busy');
    for (const resolve of resolvers) {
      resolve({
        'ok': true,
        'json': vi.fn().mockResolvedValue({ 'userCtx': { 'name': 'amara', 'roles': [] } })
      });
    }
    await Promise.all(connections);
  });

  it('buffers frames received while session validation is pending', async () => {
    delete process.env.CHATAPI_AUTH;
    const deferred: { resolve?: (value: any) => void } = {};
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((resolve) => {
      deferred.resolve = resolve;
    })));
    const wss: any = { 'on': vi.fn() };
    registerChatApiWebSocket(wss);
    const onConnection = wss.on.mock.calls[0][1];
    const ws: any = { 'readyState': WebSocket.OPEN, 'send': vi.fn(), 'close': vi.fn(), 'on': vi.fn() };
    const connecting = onConnection(ws, {
      'headers': { 'host': 'planet.local:5000', 'cookie': 'AuthSession=abc' },
      'socket': { 'remoteAddress': '10.0.0.9' }
    });
    const queued = messageHandler(ws)(JSON.stringify({ 'content': 'hi' }));
    expect(mocks.chat).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(deferred.resolve).toBeDefined());
    if (!deferred.resolve) {
      throw new Error('session resolver was not initialized');
    }
    deferred.resolve({
      'ok': true,
      'json': vi.fn().mockResolvedValue({ 'userCtx': { 'name': 'amara', 'roles': [] } })
    });
    await connecting;
    await queued;
    expect(mocks.chat).toHaveBeenCalledWith(
      { 'content': 'hi' },
      expect.objectContaining({ 'sessionUser': 'amara' })
    );
  });

  it('authenticates once at connection setup and closes after one turn', async () => {
    delete process.env.CHATAPI_AUTH;
    const fetchMock = vi.fn().mockResolvedValue({
      'ok': true,
      'json': vi.fn().mockResolvedValue({ 'userCtx': { 'name': 'amara', 'roles': [] } })
    });
    vi.stubGlobal('fetch', fetchMock);
    const ws = await connect({ 'host': 'planet.local:5000', 'cookie': 'AuthSession=abc' });

    await messageHandler(ws)(JSON.stringify({ 'content': 'hi' }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.chat).toHaveBeenCalledWith(
      { 'content': 'hi' },
      expect.objectContaining({ 'sessionUser': 'amara' })
    );
    expect(ws.close).toHaveBeenCalledWith(1000, 'Turn complete');
  });

  it('rejects a second frame instead of processing turns concurrently', async () => {
    const ws = await connect({ 'host': 'planet.local:5000', 'cookie': 'AuthSession=abc' });

    await messageHandler(ws)(JSON.stringify({ 'content': 'hi' }));
    await messageHandler(ws)(JSON.stringify({ 'content': 'again' }));

    expect(mocks.chat).toHaveBeenCalledTimes(1);
    expect(JSON.parse(ws.send.mock.calls.at(-1)[0])).toMatchObject({
      'type': 'error',
      'error': 'Too Many Requests',
      'message': 'Only one chat turn is allowed per WebSocket connection'
    });
    expect(ws.close).toHaveBeenCalledWith(1008, 'Only one chat turn is allowed');
  });

  it('allows only one pending frame while authentication is in progress', async () => {
    delete process.env.CHATAPI_AUTH;
    let resolveSession: (value: any) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((resolve) => {
      resolveSession = resolve;
    })));
    const wss: any = { 'on': vi.fn() };
    registerChatApiWebSocket(wss);
    const onConnection = wss.on.mock.calls[0][1];
    const ws: any = { 'readyState': WebSocket.OPEN, 'send': vi.fn(), 'close': vi.fn(), 'on': vi.fn() };
    const connecting = onConnection(ws, {
      'headers': { 'host': 'planet.local:5000', 'cookie': 'AuthSession=abc' },
      'socket': { 'remoteAddress': '10.0.0.9' }
    });
    const onMessage = messageHandler(ws);

    onMessage(Buffer.from('{"content":"first"}'));
    onMessage(Buffer.from('{"content":"second"}'));

    expect(JSON.parse(ws.send.mock.calls[0][0])).toMatchObject({
      'type': 'error', 'error': 'Bad Request'
    });
    expect(ws.close).toHaveBeenCalledWith(1008, 'Only one chat turn is allowed');
    resolveSession({
      'ok': true,
      'json': vi.fn().mockResolvedValue({ 'userCtx': { 'name': 'amara', 'roles': [] } })
    });
    await connecting;
  });

  it('returns a bad-request frame for malformed JSON', async () => {
    const ws = await connect({ 'host': 'planet.local:5000' });
    await messageHandler(ws)('{oops');
    expect(JSON.parse(ws.send.mock.calls.at(-1)[0])).toMatchObject({
      'type': 'error', 'error': 'Bad Request', 'message': 'Invalid data format'
    });
    expect(mocks.chat).not.toHaveBeenCalled();
  });

  it('returns stable application error codes over WebSocket', async () => {
    mocks.chat.mockRejectedValueOnce(new HttpError(
      400,
      'AI provider "gemini" does not support resource attachment search',
      'resource_attachments_unsupported'
    ));
    const ws = await connect({ 'host': 'planet.local:5000' });

    await messageHandler(ws)(JSON.stringify({ 'content': 'summarize the attachment' }));

    expect(JSON.parse(ws.send.mock.calls.at(-1)[0])).toEqual({
      'type': 'error',
      'error': 'Bad Request',
      'message': 'AI provider "gemini" does not support resource attachment search',
      'code': 'resource_attachments_unsupported'
    });
  });

  it('aborts provider work and sends no terminal frame after the socket closes', async () => {
    let providerSignal: AbortSignal | undefined;
    mocks.chat.mockImplementation((payload, options) => {
      void payload;
      providerSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { 'once': true });
      });
    });
    const ws = await connect({ 'host': 'planet.local:5000' });
    const pending = messageHandler(ws)(JSON.stringify({ 'content': 'hi' }));
    await vi.waitFor(() => expect(providerSignal).toBeDefined());
    const onClose = ws.on.mock.calls.find((call: any[]) => call[0] === 'close')[1];
    onClose();
    await pending;

    expect(providerSignal?.aborted).toEqual(true);
    expect(ws.send).not.toHaveBeenCalled();
  });
});
