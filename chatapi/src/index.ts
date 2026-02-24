import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import WebSocket from 'ws';

import { chat, chatNoSave } from './services/chat.service';
import { keys } from './config/ai-providers.config';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const CLIENT_LOG_WINDOW_MS = 60_000;
const clientLogLastSeen = new Map<string, number>();

const getClientIp = (req: any) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : undefined;

  return forwardedIp || req.ip || req.socket?.remoteAddress || 'unknown';
};

/**
 * Intentionally consumes request metadata so we can trace abusive clients without
 * logging every request. Keep this call in GET handlers even if the data is not
 * part of the response body.
 */
const logClientMetadata = (req: any, route: string) => {
  const clientIp = getClientIp(req);
  const userAgent = req.get('user-agent') || 'unknown';
  const key = `${route}:${clientIp}:${userAgent}`;
  const now = Date.now();
  const lastLoggedAt = clientLogLastSeen.get(key);

  if (lastLoggedAt && now - lastLoggedAt < CLIENT_LOG_WINDOW_MS) {
    return;
  }

  clientLogLastSeen.set(key, now);
  console.log(`[request-metadata] route=${route} ip=${clientIp} userAgent=${userAgent}`); // eslint-disable-line no-console
};

/**
 * Request-aware provider scoping is intentionally header driven so reverse
 * proxies can hide internal providers from public clients.
 */
const getProviderAvailability = (req: any) => {
  const hasInternalToken = process.env.INTERNAL_PROVIDER_TOKEN
    ? req.get('x-internal-token') === process.env.INTERNAL_PROVIDER_TOKEN
    : false;
  const scopeHeader = (req.get('x-provider-scope') || 'public').toLowerCase();
  const isInternalRequest = scopeHeader === 'internal' && hasInternalToken;

  return {
    'openai': !!keys.openai.apiKey,
    'perplexity': isInternalRequest && !!keys.perplexity.apiKey,
    'deepseek': isInternalRequest && !!keys.deepseek.apiKey,
    'gemini': !!keys.gemini.apiKey
  };
};

app.use(cors());
// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/', (req: any, res: any) => {
  // Intentional request dependency: supports rate-limited telemetry for GET traffic.
  logClientMetadata(req, '/');

  res.status(200).json({
    'status': 'Success',
    'message': 'OLE Chat API Service',
  });
});

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    try {
      data = JSON.parse(data.toString());
      if (!isValidData(data)) {
        ws.send(JSON.stringify({ 'error': 'Invalid data format.' }));
        return;
      }

      const chatResponse = await chat(data, true, (response) => {
        ws.send(JSON.stringify({ 'type': 'partial', response }));
      });

      if (chatResponse) {
        ws.send(JSON.stringify({
          'type': 'final',
          'completionText': chatResponse.completionText,
          'couchDBResponse': chatResponse.couchSaveResponse
        }));
      }
    } catch (error: any) {
      if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
        ws.send(JSON.stringify({ 'error': 'Not Found', 'message': 'Conversation not found' }));
      } else {
        ws.send(JSON.stringify({ 'error': 'Internal Server Error', 'message': error.message }));
      }
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed'); // eslint-disable-line no-console
  });
});

app.post('/', async (req: any, res: any) => {
  const { data, save } = req.body;

  if (!isValidData(data)) {
    return res.status(400).json({ 'error': 'Bad Request', 'message': 'The "data" field must be a non-empty object' });
  }

  try {
    if (!save) {
      const response = await chatNoSave(data.content, data.aiProvider, data.assistant, data.context);
      return res.status(200).json({
        'status': 'Success',
        'chat': response
      });
    } else {
      const response = await chat(data, false);
      return res.status(201).json({
        'status': 'Success',
        'chat': response?.completionText,
        'couchDBResponse': response?.couchSaveResponse
      });
    }
  } catch (error: any) {
    if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
      return res.status(404).json({ 'error': 'Not Found', 'message': 'Conversation not found' });
    }
    return res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
  }
});

app.get('/checkproviders', async (req: any, res: any) => {
  // Intentional request dependency: request headers can scope provider visibility.
  logClientMetadata(req, '/checkproviders');

  res.status(200).json(getProviderAvailability(req));
});

const port = process.env.SERVE_PORT || 5000;

server.listen(port, () => console.log(`Server running on port ${port}`)); // eslint-disable-line no-console
