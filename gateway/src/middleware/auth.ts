import { NextFunction, Request, Response } from 'express';
import { IncomingHttpHeaders, IncomingMessage, STATUS_CODES } from 'http';
import { Duplex } from 'stream';
import WebSocket from 'ws';

import { couchBaseUrl } from '../config/couch.config';
import { isAllowedOrigin } from './origin';

export interface SessionInfo {
  name: string;
  roles: string[];
}

export interface OpenRoute {
  methods: string[];
  path: RegExp;
}

export class SessionValidationError extends Error {
  constructor(public readonly upstreamStatus?: number) {
    super('Planet session validation is unavailable');
    this.name = 'SessionValidationError';
  }
}

const SESSION_TIMEOUT_MS = 10000;
const UNAVAILABLE_SESSION_STATUSES = new Set([ 408, 429 ]);
const MAX_CONCURRENT_SESSION_VALIDATIONS = 8;
let sessionValidationsInFlight = 0;

export const authSessionCookie = (cookieHeader: string | undefined): string | undefined => {
  for (const cookie of cookieHeader?.split(';') || []) {
    const separator = cookie.indexOf('=');
    if (separator > 0 && cookie.slice(0, separator).trim() === 'AuthSession') {
      const value = cookie.slice(separator + 1).trim();
      if (value) {
        return value;
      }
    }
  }
  return undefined;
};

const sessionCredentials = (headers: IncomingHttpHeaders): Record<string, string> | undefined => {
  const credentials: Record<string, string> = {};
  const cookie = authSessionCookie(headers.cookie);
  if (cookie) {
    credentials.cookie = `AuthSession=${cookie}`;
  }
  if (/^basic \S/i.test(headers.authorization || '')) {
    credentials.authorization = headers.authorization as string;
  }
  return Object.keys(credentials).length > 0 ? credentials : undefined;
};

interface SessionCheck {
  session: SessionInfo | null;
  renewedCookie?: string;
}

async function fetchSession(credentials: Record<string, string>): Promise<SessionCheck> {
  try {
    const response = await fetch(`${couchBaseUrl}/_session`, {
      'headers': credentials,
      'signal': AbortSignal.timeout(SESSION_TIMEOUT_MS)
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status >= 400 && response.status < 500 && !UNAVAILABLE_SESSION_STATUSES.has(response.status)) {
        return { 'session': null };
      }
      throw new SessionValidationError(response.status);
    }
    const body = await response.json() as { userCtx?: { name?: string | null; roles?: string[] } };
    if (!body.userCtx?.name) {
      return { 'session': null };
    }
    // CouchDB renews an ageing session cookie on use; chatting would otherwise outlive the browser's copy
    return {
      'session': { 'name': body.userCtx.name, 'roles': body.userCtx.roles || [] },
      'renewedCookie': response.headers.get('set-cookie') || undefined
    };
  } catch (error) {
    const sessionError = error instanceof SessionValidationError ? error : new SessionValidationError();
    const upstreamStatus = sessionError.upstreamStatus === undefined ? '' : ` (CouchDB status ${sessionError.upstreamStatus})`;
    console.error(`gateway: session validation failed${upstreamStatus}: ${error}`); // eslint-disable-line no-console
    throw sessionError;
  }
}

/** Ask CouchDB who the request belongs to, with a bound on concurrent checks so bogus credentials can't pile up work. */
async function checkSession(headers: IncomingHttpHeaders): Promise<SessionCheck> {
  const credentials = sessionCredentials(headers);
  if (!credentials) {
    return { 'session': null };
  }
  if (sessionValidationsInFlight >= MAX_CONCURRENT_SESSION_VALIDATIONS) {
    throw new SessionValidationError();
  }
  sessionValidationsInFlight += 1;
  try {
    return await fetchSession(credentials);
  } finally {
    sessionValidationsInFlight -= 1;
  }
}

export async function validateSession(headers: IncomingHttpHeaders): Promise<SessionInfo | null> {
  return (await checkSession(headers)).session;
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  let check: SessionCheck;
  try {
    check = await checkSession(req.headers);
  } catch (error) {
    res.status(503).json({ 'error': 'Service Unavailable', 'message': 'Planet session validation is unavailable' });
    return;
  }
  if (!check.session) {
    res.status(401).json({ 'error': 'Unauthorized', 'message': 'A valid Planet session is required' });
    return;
  }
  if (check.renewedCookie) {
    res.append('Set-Cookie', check.renewedCookie);
  }
  res.locals.session = check.session;
  next();
}

export const requireSessionExcept = (openRoutes: OpenRoute[]) => (req: Request, res: Response, next: NextFunction) => {
  if (openRoutes.some((route) => route.methods.includes(req.method) && route.path.test(req.path))) {
    next();
    return;
  }
  void requireSession(req, res, next);
};

const rejectUpgrade = (socket: Duplex, status: number) => {
  socket.once('finish', () => socket.destroy());
  socket.end(`HTTP/1.1 ${status} ${STATUS_CODES[status]}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
};

/** Check the origin and session before the WebSocket opens, so no frame arrives before authentication. */
export const authenticateUpgrade = (wss: WebSocket.Server) => async (req: IncomingMessage, socket: Duplex, head: Buffer) => {
  const onSocketError = (error: Error) => {
    console.error(`gateway: WebSocket upgrade failed: ${error.message}`); // eslint-disable-line no-console
  };
  socket.on('error', onSocketError);
  if (!isAllowedOrigin(req.headers)) {
    rejectUpgrade(socket, 403);
    return;
  }
  let session: SessionInfo | null;
  try {
    session = await validateSession(req.headers);
  } catch (error) {
    rejectUpgrade(socket, 503);
    return;
  }
  if (!session) {
    rejectUpgrade(socket, 401);
    return;
  }
  socket.removeListener('error', onSocketError);
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req, session));
};
