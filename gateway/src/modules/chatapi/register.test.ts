import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  'chat': vi.fn()
}));

vi.mock('../../config/couch.config', () => ({ 'couchBaseUrl': 'http://couchdb:5984' }));
vi.mock('./services/chat.service', () => ({ 'chat': mocks.chat }));
vi.mock('./services/analyze.service', () => ({ 'analyze': vi.fn() }));
vi.mock('./services/config.service', () => ({ 'getAIConfig': vi.fn() }));
vi.mock('./services/resource-index.service', () => ({ 'ensureResourceIndexed': vi.fn(), 'deleteResourceIndex': vi.fn() }));

import { registerChatApiWebSocket } from './register';
import { resetRateLimiter } from './middleware/rate-limit';

const connect = async (headers: Record<string, string | undefined>) => {
  const wss: any = { 'on': vi.fn() };
  registerChatApiWebSocket(wss);
  const onConnection = wss.on.mock.calls[0][1];
  const ws: any = { 'send': vi.fn(), 'close': vi.fn(), 'on': vi.fn() };
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
  });

  it('refuses cross-origin browser connections', async () => {
    const ws = await connect({ 'origin': 'http://evil.test', 'host': 'planet.local:5000' });
    expect(ws.close).toHaveBeenCalled();
    expect(ws.on).not.toHaveBeenCalled();
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

  it('rate-limits chat turns on the shared chat window', async () => {
    process.env.RATE_LIMIT_PER_MINUTE = '2';
    const ws = await connect({ 'host': 'planet.local:5000' });
    const onMessage = messageHandler(ws);
    for (let i = 0; i < 3; i++) {
      await onMessage(JSON.stringify({ 'content': 'hi' }));
    }
    expect(mocks.chat).toHaveBeenCalledTimes(2);
    const lastFrame = JSON.parse(ws.send.mock.calls.at(-1)[0]);
    expect(lastFrame).toMatchObject({ 'type': 'error', 'error': 'Too Many Requests' });
  });
});
