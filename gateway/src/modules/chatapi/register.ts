import { Express } from 'express';
import WebSocket from 'ws';

import { ConfigurationUnavailableError } from '../../services/config.service';
import { configuredProviders } from './providers/clients';
import { chat, chatNoSave } from './services/chat.service';

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

export function registerChatApiRoutes(app: Express) {
  app.post('/', async (req: any, res: any, next: any) => {
    const { data, save } = req.body;

    if (!isValidData(data)) {
      return res.status(400).json({ 'error': 'Bad Request', 'message': 'The "data" field must be a non-empty object' });
    }

    try {
      if (!save) {
        const response = await chatNoSave(data.content, data.aiProvider, data.context);
        return res.status(200).json({
          'status': 'Success',
          'chat': response
        });
      }
      const response = await chat(data, false);
      return res.status(201).json({
        'status': 'Success',
        'chat': response?.completionText,
        'couchDBResponse': response?.couchSaveResponse
      });
    } catch (error: any) {
      if (error instanceof ConfigurationUnavailableError) {
        return next(error);
      }
      if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
        return res.status(404).json({ 'error': 'Not Found', 'message': 'Conversation not found' });
      }
      return res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
    }
  });

  app.get('/checkproviders', (req: any, res: any, next: any) => {
    void req;
    configuredProviders().then((providers) => res.status(200).json(providers)).catch(next);
  });
}

export function registerChatApiWebSocket(wss: WebSocket.Server) {
  wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (!isValidData(payload)) {
          ws.send(JSON.stringify({ 'error': 'Invalid data format.' }));
          return;
        }

        const chatResponse = await chat(payload, true, (response) => {
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
        if (error instanceof ConfigurationUnavailableError) {
          ws.send(JSON.stringify({ 'error': error.name, 'message': error.message }));
        } else if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
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
}
