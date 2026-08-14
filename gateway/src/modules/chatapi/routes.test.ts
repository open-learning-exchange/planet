import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';

const mocks = vi.hoisted(() => ({
  'chat': vi.fn(),
  'deleteResourceIndex': vi.fn(),
  'fileSearchContentTypes': [ 'application/pdf', 'text/plain' ],
  'getOpenAIIndexClient': vi.fn(),
  'getAIConfig': vi.fn()
}));

vi.mock('./services/chat.service', () => ({ 'chat': mocks.chat }));
vi.mock('./services/analyze.service', () => ({ 'analyze': vi.fn() }));
vi.mock('./services/config.service', () => ({ 'getAIConfig': mocks.getAIConfig }));
vi.mock('./services/resource-index.service', () => ({
  'deleteResourceIndex': mocks.deleteResourceIndex,
  'FILE_SEARCH_CONTENT_TYPES': mocks.fileSearchContentTypes,
  'getOpenAIIndexClient': mocks.getOpenAIIndexClient
}));

import { requireSession } from './middleware/auth';
import { resetRateLimiter } from './middleware/rate-limit';
import { registerChatApiRoutes } from './routes';
import { HttpError } from './utils/http-error';

const routeContext = (
  body: object,
  locals: { user?: string; roles?: string[] } = { 'user': 'amara', 'roles': [ 'manager' ] }
) => {
  const req: any = new EventEmitter();
  req.body = body;
  const res: any = new EventEmitter();
  res.locals = locals;
  res.headersSent = false;
  res.writableEnded = false;
  res.destroyed = false;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return { req, res };
};

const registeredApp = () => {
  const app: any = { 'post': vi.fn(), 'get': vi.fn() };
  registerChatApiRoutes(app);
  return app;
};

const routeHandler = (app: any, method: 'post' | 'get', path: string) =>
  app[method].mock.calls.find((call: any[]) => call[0] === path).at(-1);

const routeMiddleware = (app: any, method: 'post' | 'get', path: string) =>
  app[method].mock.calls.find((call: any[]) => call[0] === path).at(-2);

describe('chatapi HTTP routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimiter();
    delete process.env.RATE_LIMIT_PER_MINUTE;
  });

  it('protects every route with session validation', () => {
    const app = registeredApp();
    const routes = [ ...app.post.mock.calls, ...app.get.mock.calls ];
    expect(routes.map((route: any[]) => route[0])).toEqual([
      '/', '/analyze', '/resources/indexes/cleanup', '/checkproviders'
    ]);
    expect(routes.every((route: any[]) => route[1] === requireSession)).toEqual(true);
  });

  it('returns stable application error codes', async () => {
    mocks.chat.mockRejectedValueOnce(new HttpError(
      400,
      'AI provider "gemini" does not support resource attachment search',
      'resource_attachments_unsupported'
    ));
    const handler = routeHandler(registeredApp(), 'post', '/');
    const { req, res } = routeContext({ 'data': { 'content': 'hi' }, 'save': false });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      'error': 'Bad Request',
      'message': 'AI provider "gemini" does not support resource attachment search',
      'code': 'resource_attachments_unsupported'
    });
  });

  it('deduplicates resource cleanup without loading OpenAI when no index exists', async () => {
    mocks.deleteResourceIndex.mockResolvedValue({ 'removed': false });
    const handler = routeHandler(registeredApp(), 'post', '/resources/indexes/cleanup');
    const { req, res } = routeContext({ 'resourceIds': [ 'res1', 'res2', 'res1' ] });

    await handler(req, res);

    expect(mocks.deleteResourceIndex).toHaveBeenCalledTimes(2);
    expect(mocks.getAIConfig).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      'status': 'Success',
      'results': [
        { 'resourceId': 'res1', 'removed': false },
        { 'resourceId': 'res2', 'removed': false }
      ]
    });
  });

  it('continues a cleanup batch after one resource fails', async () => {
    mocks.deleteResourceIndex
      .mockRejectedValueOnce(new Error('temporary cleanup failure'))
      .mockResolvedValueOnce({ 'removed': true });
    const handler = routeHandler(registeredApp(), 'post', '/resources/indexes/cleanup');
    const { req, res } = routeContext({ 'resourceIds': [ 'res1', 'res2' ] });

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      'status': 'Success',
      'results': [
        { 'resourceId': 'res1', 'removed': false, 'failed': true },
        { 'resourceId': 'res2', 'removed': true }
      ]
    });
  });

  it('defers untouched resources when the cleanup time budget expires', async () => {
    vi.useFakeTimers();
    try {
      mocks.deleteResourceIndex.mockImplementation((getClient, resourceId, requester, signal) => {
        void getClient;
        void resourceId;
        void requester;
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(signal.reason), { 'once': true });
        });
      });
      const handler = routeHandler(registeredApp(), 'post', '/resources/indexes/cleanup');
      const { req, res } = routeContext({ 'resourceIds': [ 'res1', 'res2' ] });

      const pending = handler(req, res);
      await vi.advanceTimersByTimeAsync(10000);
      await pending;

      expect(mocks.deleteResourceIndex).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        'status': 'Success',
        'results': [ 'res1', 'res2' ].map((resourceId) => ({
          resourceId,
          'removed': false,
          'deferred': true
        }))
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('rate-limits cleanup batches', async () => {
    const limiter = routeMiddleware(registeredApp(), 'post', '/resources/indexes/cleanup');
    const next = vi.fn();

    for (let request = 0; request < 5; request++) {
      const allowed = routeContext({ 'resourceIds': [ `res-${request}` ] });
      await limiter(allowed.req, allowed.res, next);
    }
    const rejected = routeContext({ 'resourceIds': [ 'res-6' ] });
    await limiter(rejected.req, rejected.res, next);

    expect(next).toHaveBeenCalledTimes(5);
    expect(rejected.res.status).toHaveBeenCalledWith(429);
  });

  it('returns current provider capabilities and file-search content types', async () => {
    mocks.getAIConfig.mockResolvedValue({
      'providers': {
        'openai': { 'enabled': true },
        'perplexity': { 'enabled': false },
        'deepseek': { 'enabled': false },
        'gemini': { 'enabled': false }
      }
    });
    const handler = routeHandler(registeredApp(), 'get', '/checkproviders');
    const { req, res } = routeContext({});

    await handler(req, res);

    expect(mocks.getAIConfig).toHaveBeenCalledWith(true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      'openai': {
        'enabled': true,
        'capabilities': expect.arrayContaining([ 'chat', 'fileSearch' ]),
        'fileSearchContentTypes': mocks.fileSearchContentTypes
      },
      'perplexity': expect.objectContaining({
        'enabled': false,
        'fileSearchContentTypes': []
      })
    }));
  });

  it('aborts provider work after the request disconnects', async () => {
    let providerSignal: AbortSignal | undefined;
    mocks.chat.mockImplementation((payload, options) => {
      void payload;
      providerSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), { 'once': true });
      });
    });
    const handler = routeHandler(registeredApp(), 'post', '/');
    const { req, res } = routeContext({ 'data': { 'content': 'hi' }, 'save': false }, {});

    const pending = handler(req, res);
    req.emit('aborted');
    await pending;

    expect(providerSignal?.aborted).toEqual(true);
    expect(res.status).not.toHaveBeenCalled();
  });
});
