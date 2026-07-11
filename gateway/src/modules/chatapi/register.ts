/* eslint-disable no-console */
import { Express, Request, Response } from 'express';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

import { chat } from './services/chat.service';
import { analyze } from './services/analyze.service';
import { getAIConfig } from './services/config.service';
import { deleteResourceIndex, ensureResourceIndexed } from './services/resource-index.service';
import { allowedOrigins, getSessionUser, isAuthRequired, requireManager, requireSession } from './middleware/auth';
import { providerCapabilities } from './providers';
import { PROVIDER_NAMES } from './models/chat.model';
import { HttpError, toHttpError } from './utils/http-error';

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

const errorName = (statusCode: number): string => {
  switch (statusCode) {
  case 400: return 'Bad Request';
  case 401: return 'Unauthorized';
  case 403: return 'Forbidden';
  case 404: return 'Not Found';
  case 502: return 'Bad Gateway';
  case 503: return 'Service Unavailable';
  default: return 'Internal Server Error';
  }
};

const handleError = (res: Response, error: any) => {
  const httpError = toHttpError(error, 'Unexpected error');
  res.status(httpError.statusCode).json({ 'error': errorName(httpError.statusCode), 'message': httpError.message });
};

const openaiClient = async () => {
  const config = await getAIConfig();
  const { enabled, client } = config.providers.openai;
  if (!enabled || !client) {
    throw new HttpError(503, 'AI provider "openai" is not configured');
  }
  return client;
};

export function registerChatApiRoutes(app: Express) {
  app.post('/', requireSession, async (req: Request, res: Response) => {
    const { data, save } = req.body;
    if (!isValidData(data)) {
      return res.status(400).json({ 'error': 'Bad Request', 'message': 'The "data" field must be a non-empty object' });
    }
    try {
      const outcome = await chat(data, { 'save': !!save, 'sessionUser': res.locals.user });
      return res.status(save ? 201 : 200).json({
        'status': 'Success',
        'chat': outcome.completionText,
        'citations': outcome.citations,
        ...(save ? { 'couchDBResponse': outcome.couchSaveResponse } : {})
      });
    } catch (error) {
      return handleError(res, error);
    }
  });

  app.get('/checkproviders', async (req: Request, res: Response) => {
    void req;
    const config = await getAIConfig();
    const providers = PROVIDER_NAMES.reduce((result, name) => {
      result[name] = {
        'enabled': config.providers[name].enabled,
        'capabilities': providerCapabilities(name)
      };
      return result;
    }, {} as Record<string, { enabled: boolean; capabilities: string[] }>);
    res.status(200).json(providers);
  });

  app.post('/analyze', requireSession, async (req: Request, res: Response) => {
    try {
      const result = await analyze(req.body);
      res.status(200).json({ 'status': 'Success', ...result });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/resources/:id/index', requireSession, requireManager, async (req: Request, res: Response) => {
    try {
      const client = await openaiClient();
      const index = await ensureResourceIndexed(client, req.params.id, res.locals.user);
      res.status(200).json({
        'status': 'Success',
        'indexed': !!index,
        ...(index
          ? { 'vectorStoreId': index.vectorStoreId, 'indexedFiles': index.indexedFiles }
          : { 'message': 'Resource has no supported attachments' })
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.delete('/resources/:id/index', requireSession, requireManager, async (req: Request, res: Response) => {
    try {
      const client = await openaiClient();
      const { removed, rev } = await deleteResourceIndex(client, req.params.id);
      res.status(200).json({ 'status': 'Success', removed, ...(rev ? { rev } : {}) });
    } catch (error) {
      handleError(res, error);
    }
  });
}

export function registerChatApiWebSocket(wss: WebSocket.Server) {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    // Same origin policy as the credentialed CORS setup; browsers always send Origin on WS handshakes
    const origins = allowedOrigins();
    if (origins.length && req.headers.origin && !origins.includes(req.headers.origin)) {
      ws.close();
      return;
    }
    let sessionUser: string | undefined;
    if (isAuthRequired()) {
      sessionUser = await getSessionUser(req.headers.cookie) || undefined;
      if (!sessionUser) {
        ws.send(JSON.stringify({ 'type': 'error', 'error': 'Unauthorized', 'message': 'A valid Planet session is required' }));
        ws.close();
        return;
      }
    }

    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (!isValidData(payload)) {
          ws.send(JSON.stringify({ 'type': 'error', 'error': 'Bad Request', 'message': 'Invalid data format' }));
          return;
        }
        const outcome = await chat(payload, {
          'save': true,
          sessionUser,
          'onDelta': (delta) => ws.send(JSON.stringify({ 'type': 'partial', 'response': delta }))
        });
        ws.send(JSON.stringify({
          'type': 'final',
          'completionText': outcome.completionText,
          'citations': outcome.citations,
          'couchDBResponse': outcome.couchSaveResponse
        }));
      } catch (error: any) {
        const httpError = toHttpError(error, 'Unexpected error');
        ws.send(JSON.stringify({ 'type': 'error', 'error': errorName(httpError.statusCode), 'message': httpError.message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });
}
