import { Express } from 'express';
import WebSocket from 'ws';

import { requireManager, SessionInfo } from '../../middleware/auth';
import { HttpError, toHttpError } from '../../middleware/errors';
import { DbDoc, ShareAudience } from './models/db-doc.model';
import { listProviders } from './providers/clients';
import { chat, chatNoSave } from './services/chat.service';
import { chatUsage, conversationChange, getConversation, listConversations, updateConversation } from './services/history.service';
import { getSharedChat, MAX_PREVIEW_IDS, shareConversation, sharePreviews, stopSharing } from './services/share.service';
import { isPlainDocId } from './utils/db.utils';

const isValidData = (data: any) => data && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0;

const respondWithConversation = (res: any, next: any, conversation?: DbDoc) => conversation ?
  res.status(200).json(conversation) :
  next(new HttpError(404, 'Conversation not found'));

const shareAudience = ({ audience, teamId }: any = {}): ShareAudience | undefined => {
  if (audience === 'community') {
    return { 'type': 'community' };
  }
  return audience === 'team' && isPlainDocId(teamId) ? { 'type': 'team', teamId } : undefined;
};

export function registerChatApiRoutes(app: Express) {
  app.post('/', async (req: any, res: any, next: any) => {
    const { data, save } = req.body;

    if (!isValidData(data)) {
      return next(new HttpError(400, 'The "data" field must be a non-empty object'));
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
        'chat': response.completionText,
        'couchDBResponse': response.couchSaveResponse
      });
    } catch (error) {
      return next(error);
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
    getConversation(req.params.id, res.locals.session).then((conversation) => respondWithConversation(res, next, conversation)).catch(next);
  });

  app.patch('/chat/conversations/:id', (req: any, res: any, next: any) => {
    const change = conversationChange(req.body);
    if (!change) {
      return next(new HttpError(400, 'Send a non-empty "title"'));
    }
    return updateConversation(req.params.id, res.locals.session, change)
      .then((conversation) => respondWithConversation(res, next, conversation))
      .catch(next);
  });

  app.post('/chat/conversations/:id/shares', (req: any, res: any, next: any) => {
    const audience = shareAudience(req.body);
    if (!audience) {
      return next(new HttpError(400, 'Send "audience": "community", or "audience": "team" with a "teamId"'));
    }
    return shareConversation(req.params.id, res.locals.session, audience, req.body.live === true)
      .then((share) => share ? res.status(201).json(share) : next(new HttpError(404, 'Conversation not found')))
      .catch(next);
  });

  // By share id alone, so deleting a voice, which holds only the share id, can stop its share
  app.delete('/chat/shares/:shareId', (req: any, res: any, next: any) => {
    stopSharing(req.params.shareId, res.locals.session)
      .then((stopped) => stopped ? res.status(204).end() : next(new HttpError(404, 'Share not found')))
      .catch(next);
  });

  app.get('/chat/shares/:shareId', (req: any, res: any, next: any) => {
    getSharedChat(req.params.shareId, res.locals.session)
      .then((sharedChat) => sharedChat ? res.status(200).json(sharedChat) : next(new HttpError(404, 'Share not found')))
      .catch(next);
  });

  app.get('/chat/shares', (req: any, res: any, next: any) => {
    const ids = typeof req.query.ids === 'string' ? [ ...new Set(req.query.ids.split(',').filter(Boolean)) ] as string[] : [];
    if (ids.length === 0 || ids.length > MAX_PREVIEW_IDS) {
      return next(new HttpError(400, `Send 1 to ${MAX_PREVIEW_IDS} comma-separated share "ids"`));
    }
    return sharePreviews(ids, res.locals.session).then((previews) => res.status(200).json(previews)).catch(next);
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
          ws.send(JSON.stringify({ 'type': 'error', 'error': 'Invalid data format.' }));
          return;
        }

        const chatResponse = await chat(payload, session, true, (response) => {
          ws.send(JSON.stringify({ 'type': 'partial', response }));
        });

        ws.send(JSON.stringify({
          'type': 'final',
          'completionText': chatResponse.completionText,
          'couchDBResponse': chatResponse.couchSaveResponse
        }));
      } catch (error) {
        ws.send(JSON.stringify({ 'type': 'error', 'error': toHttpError(error).message }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed'); // eslint-disable-line no-console
    });
  });
}
