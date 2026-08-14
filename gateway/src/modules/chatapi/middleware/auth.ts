/* eslint-disable no-console */
import { NextFunction, Request, Response } from 'express';

import { couchBaseUrl } from '../../../config/couch.config';

export interface SessionInfo {
  name: string;
  roles: string[];
}

export class SessionValidationError extends Error {
  constructor(public readonly upstreamStatus?: number) {
    super('Planet session validation is unavailable');
    this.name = 'SessionValidationError';
  }
}

const MANAGE_ROLES = [ '_admin', 'manager' ];
const UNAVAILABLE_SESSION_STATUSES = new Set([ 408, 429 ]);
const DEFAULT_SESSION_TIMEOUT_MS = 10000;
const MAX_TIMER_DURATION_MS = 2147483647;

export const canManageResources = (roles: string[]): boolean => roles.some((role) => MANAGE_ROLES.includes(role));

const authDisabled = () => (process.env.CHATAPI_AUTH || '').toLowerCase() === 'none';
const sessionTimeout = (): number => {
  const configured = Number(process.env.COUCHDB_SESSION_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? Math.min(configured, MAX_TIMER_DURATION_MS)
    : DEFAULT_SESSION_TIMEOUT_MS;
};

/**
 * Extra browser origins allowed by future credentialed CORS and WebSocket wiring.
 * An empty list does not permit cross-origin access; same-origin requests need no entry.
 */
export const allowedOrigins = (): string[] =>
  (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

export const isTrustedOrigin = (origin: string, host: string | undefined): boolean => {
  try {
    if (host && new URL(origin).host === host) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return allowedOrigins().includes(origin);
};

/** Build credentialed CORS options without letting `cors` interpret false as a wildcard. */
export const browserCorsOptions = (origin: string | undefined, host: string | undefined) => ({
  'origin': !origin || isTrustedOrigin(origin, host) ? true : [],
  'credentials': true
});

export const isAuthRequired = (): boolean => !authDisabled();

/** Extract the exact CouchDB session cookie shared by HTTP and WebSocket auth. */
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

export async function getSession(cookie: string | undefined): Promise<SessionInfo | null> {
  if (!cookie || !authSessionCookie(cookie)) {
    return null;
  }
  try {
    const response = await fetch(`${couchBaseUrl}/_session`, {
      'headers': { cookie },
      'signal': AbortSignal.timeout(sessionTimeout())
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status >= 400 && response.status < 500 && !UNAVAILABLE_SESSION_STATUSES.has(response.status)) {
        return null;
      }
      throw new SessionValidationError(response.status);
    }
    const session = await response.json() as { userCtx?: { name?: string | null; roles?: string[] } };
    return session.userCtx?.name ? { 'name': session.userCtx.name, 'roles': session.userCtx.roles || [] } : null;
  } catch (error) {
    const sessionError = error instanceof SessionValidationError ? error : new SessionValidationError();
    const upstreamStatus = sessionError.upstreamStatus === undefined ? '' : ` (CouchDB status ${sessionError.upstreamStatus})`;
    console.error(`chatapi: session validation failed${upstreamStatus}: ${error}`);
    throw sessionError;
  }
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  if (authDisabled()) {
    next();
    return;
  }
  let session: SessionInfo | null;
  try {
    session = await getSession(req.headers.cookie);
  } catch (error) {
    const sessionError = error instanceof SessionValidationError ? error : new SessionValidationError();
    res.status(503).json({ 'error': 'Service Unavailable', 'message': sessionError.message });
    return;
  }
  if (!session) {
    res.status(401).json({ 'error': 'Unauthorized', 'message': 'A valid Planet session is required' });
    return;
  }
  res.locals.user = session.name;
  res.locals.roles = session.roles;
  next();
}
