import { Express } from 'express';
import WebSocket from 'ws';

import { SessionInfo } from '../../middleware/auth';
import { chat, chatNoSave, ConversationAccessError } from './services/chat.service';
import { keys } from './config/ai-providers.config';

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

export function registerChatApiRoutes(app: Express) {
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
      }
      const response = await chat(data, res.locals.session, false);
      return res.status(201).json({
        'status': 'Success',
        'chat': response?.completionText,
        'couchDBResponse': response?.couchSaveResponse
      });
    } catch (error: any) {
      if (error instanceof ConversationAccessError) {
        return res.status(403).json({ 'error': 'Forbidden', 'message': error.message });
      }
      if (error.message === 'missing' || error.statusCode === 404 || error.error === 'not_found') {
        return res.status(404).json({ 'error': 'Not Found', 'message': 'Conversation not found' });
      }
      return res.status(500).json({ 'error': 'Internal Server Error', 'message': error.message });
    }
  });

  app.get('/checkproviders', (req: any, res: any) => {
    void req;
    res.status(200).json({
      'openai': keys.openai.apiKey ? true : false,
      'perplexity': keys.perplexity.apiKey ? true : false,
      'deepseek': keys.deepseek.apiKey ? true : false,
      'gemini': keys.gemini.apiKey ? true : false
    });
  });
}

export function registerChatApiWebSocket(wss: WebSocket.Server) {
  wss.on('connection', (ws, req, session?: SessionInfo) => {
    if (!session) {
      ws.close(1008, 'A valid Planet session is required');
      return;
    }
    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        if (!isValidData(payload)) {
          ws.send(JSON.stringify({ 'error': 'Invalid data format.' }));
          return;
        }

        const chatResponse = await chat(payload, session, true, (response) => {
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
        if (error instanceof ConversationAccessError) {
          ws.send(JSON.stringify({ 'error': 'Forbidden', 'message': error.message }));
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
