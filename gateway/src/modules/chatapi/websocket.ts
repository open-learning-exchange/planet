/* eslint-disable no-console */
import { IncomingMessage } from 'http';
import WebSocket from 'ws';

import {
  authSessionCookie,
  isAuthRequired,
  isTrustedOrigin,
  requestScheme,
  SessionInfo,
  SessionValidationBusyError,
  SessionValidationError,
  validateSession
} from './middleware/auth';
import { clientIp, consumePreAuthRequest, consumeRequest } from './middleware/rate-limit';
import { ChatRequestPayload, isNonEmptyObject } from './models/chat.model';
import { chat } from './services/chat.service';
import { httpErrorName, toHttpError } from './utils/http-error';

const WEBSOCKET_TURN_START_TIMEOUT_MS = 30000;

const socketIsOpen = (ws: WebSocket): boolean => ws.readyState === WebSocket.OPEN;

const sendSocket = (ws: WebSocket, message: Record<string, unknown>): boolean => {
  if (!socketIsOpen(ws)) {
    return false;
  }
  try {
    ws.send(JSON.stringify(message));
    return true;
  } catch (error) {
    return false;
  }
};

export function registerChatApiWebSocket(wss: WebSocket.Server) {
  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    ws.on('error', (error) => {
      console.error(`chatapi: WebSocket transport error: ${error.message}`);
    });
    const origin = req.headers.origin;
    if (origin && !isTrustedOrigin(origin, req.headers.host, requestScheme(req.headers))) {
      sendSocket(ws, { 'type': 'error', 'error': 'Forbidden', 'message': 'WebSocket origin is not allowed' });
      ws.close(1008, 'Origin not allowed');
      return;
    }

    let session: SessionInfo | null = null;
    // Assigned after authentication; the early listener buffers one frame until then.
    // eslint-disable-next-line prefer-const
    let processMessage: ((data: WebSocket.RawData) => Promise<void>) | undefined;
    let pendingMessage: WebSocket.RawData | undefined;
    let turnStartDeadline: NodeJS.Timeout | undefined;
    let activeRequest: AbortController | undefined;

    ws.on('message', (data) => {
      if (processMessage) {
        const processing = processMessage(data);
        void processing.catch(() => {
          sendSocket(ws, { 'type': 'error', 'error': 'Internal Server Error', 'message': 'Unexpected error' });
          ws.close(1011, 'Message processing failed');
        });
        return processing;
      }
      if (pendingMessage !== undefined) {
        sendSocket(ws, {
          'type': 'error',
          'error': 'Bad Request',
          'message': 'Only one chat turn is allowed per WebSocket connection'
        });
        ws.close(1008, 'Only one chat turn is allowed');
        return;
      }
      pendingMessage = data;
    });

    ws.on('close', () => {
      pendingMessage = undefined;
      if (turnStartDeadline) {
        clearTimeout(turnStartDeadline);
      }
      activeRequest?.abort(new Error('WebSocket closed'));
    });

    if (!await consumePreAuthRequest(`${clientIp(req)}:WS`)) {
      sendSocket(ws, {
        'type': 'error',
        'error': 'Too Many Requests',
        'message': 'Rate limit exceeded — try again in a minute'
      });
      ws.close(1013, 'Rate limit exceeded');
      return;
    }

    if (isAuthRequired()) {
      if (!authSessionCookie(req.headers.cookie)) {
        sendSocket(ws, { 'type': 'error', 'error': 'Unauthorized', 'message': 'A valid Planet session is required' });
        ws.close(1008, 'Session expired');
        return;
      }
      try {
        session = await validateSession(req.headers.cookie);
      } catch (error) {
        const message = error instanceof SessionValidationError
          ? error.message
          : 'Planet session validation is unavailable';
        sendSocket(ws, { 'type': 'error', 'error': 'Service Unavailable', message });
        ws.close(
          error instanceof SessionValidationBusyError ? 1013 : 1011,
          error instanceof SessionValidationBusyError ? 'Session validation busy' : 'Session validation unavailable'
        );
        return;
      }
      if (!session) {
        sendSocket(ws, { 'type': 'error', 'error': 'Unauthorized', 'message': 'A valid Planet session is required' });
        ws.close(1008, 'Session expired');
        return;
      }
    }

    if (!socketIsOpen(ws)) {
      return;
    }

    turnStartDeadline = setTimeout(() => {
      sendSocket(ws, { 'type': 'error', 'error': 'Unauthorized', 'message': 'Chat request was not received in time' });
      ws.close(1008, 'Chat request timed out');
    }, WEBSOCKET_TURN_START_TIMEOUT_MS);
    turnStartDeadline.unref();

    let processedMessage = false;
    processMessage = async (data) => {
      if (processedMessage) {
        sendSocket(ws, {
          'type': 'error',
          'error': 'Too Many Requests',
          'message': 'Only one chat turn is allowed per WebSocket connection'
        });
        ws.close(1008, 'Only one chat turn is allowed');
        return;
      }
      processedMessage = true;
      if (turnStartDeadline) {
        clearTimeout(turnStartDeadline);
        turnStartDeadline = undefined;
      }
      const identity = session?.name || clientIp(req);
      try {
        if (!await consumeRequest(`${identity}:chat`)) {
          sendSocket(ws, {
            'type': 'error',
            'error': 'Too Many Requests',
            'message': 'Rate limit exceeded — try again in a minute'
          });
          return;
        }
        let payload;
        try {
          payload = JSON.parse(data.toString());
        } catch (error) {
          sendSocket(ws, { 'type': 'error', 'error': 'Bad Request', 'message': 'Invalid data format' });
          return;
        }
        if (!isNonEmptyObject(payload)) {
          sendSocket(ws, { 'type': 'error', 'error': 'Bad Request', 'message': 'Invalid data format' });
          return;
        }
        activeRequest = new AbortController();
        const outcome = await chat(payload as unknown as ChatRequestPayload, {
          'save': true,
          'sessionUser': session?.name,
          'signal': activeRequest.signal,
          'onDelta': (delta) => {
            if (!activeRequest?.signal.aborted) {
              sendSocket(ws, { 'type': 'partial', 'response': delta });
            }
          }
        });
        if (!activeRequest.signal.aborted) {
          sendSocket(ws, {
            'type': 'final',
            'completionText': outcome.completionText,
            'citations': outcome.citations,
            'couchDBResponse': outcome.couchSaveResponse
          });
        }
      } catch (error) {
        if (!activeRequest?.signal.aborted) {
          const httpError = toHttpError(error, 'Unexpected error');
          sendSocket(ws, {
            'type': 'error',
            'error': httpErrorName(httpError.statusCode),
            'message': httpError.message,
            ...(httpError.code ? { 'code': httpError.code } : {})
          });
        }
      } finally {
        activeRequest = undefined;
        if (socketIsOpen(ws)) {
          ws.close(1000, 'Turn complete');
        }
      }
    };

    const authenticatedMessage = pendingMessage;
    pendingMessage = undefined;
    if (authenticatedMessage !== undefined && socketIsOpen(ws)) {
      await processMessage(authenticatedMessage);
    }
  });
}
