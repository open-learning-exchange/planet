import { Express } from 'express';
import WebSocket from 'ws';

import { requireManager, SessionInfo } from '../../middleware/auth';
import { ConfigurationUnavailableError } from '../../services/config.service';
import { DbDoc } from './models/db-doc.model';
import { listProviders } from './providers/clients';
import { chat, chatNoSave, ConversationAccessError } from './services/chat.service';
import { chatUsage, conversationChange, getConversation, listConversations, updateConversation } from './services/history.service';

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

const respondWithConversation = (res: any, conversation?: DbDoc) => conversation ?
  res.status(200).json(conversation) :
  res.status(404).json({ 'error': 'Not Found', 'message': 'Conversation not found' });

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
    listProviders().then((providers) => res.status(200).json({ providers })).catch(next);
  });

  app.get('/chat/conversations', (req: any, res: any, next: any) => {
    void req;
    listConversations(res.locals.session).then((conversations) => res.status(200).json(conversations)).catch(next);
  });

  app.get('/chat/conversations/:id', (req: any, res: any, next: any) => {
    getConversation(req.params.id, res.locals.session).then((conversation) => respondWithConversation(res, conversation)).catch(next);
  });

  app.patch('/chat/conversations/:id', (req: any, res: any, next: any) => {
    const change = conversationChange(req.body);
    if (!change) {
      return res.status(400).json({ 'error': 'Bad Request', 'message': 'Send a non-empty "title" or "shared": true' });
    }
    return updateConversation(req.params.id, res.locals.session, change)
      .then((conversation) => respondWithConversation(res, conversation))
      .catch(next);
  });

  app.get('/chat/usage', requireManager, (req: any, res: any, next: any) => {
    void req;
    chatUsage().then((usage) => res.status(200).json(usage)).catch(next);
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
          ws.send(JSON.stringify({ 'type': 'error', 'error': error.message }));
        } else if (error instanceof ConfigurationUnavailableError) {
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
