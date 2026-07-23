/* eslint-disable no-console */
import { NextFunction, Request, Response } from 'express';

import { couchBaseUrl } from '../../../config/couch.config';

/**
 * Chat endpoints are authenticated by validating the caller's CouchDB session
 * cookie (AuthSession) against the local CouchDB /_session endpoint — the same
 * session the Planet app already holds. Set CHATAPI_AUTH=none to disable
 * (e.g. for local experiments); the public/ module routes are always open.
 */

export interface SessionInfo {
  name: string;
  roles: string[];
}

/** Roles allowed to manage resource indexes (matches Planet's manager/admin split). */
const MANAGE_ROLES = [ '_admin', 'manager' ];

export const canManageResources = (roles: string[]): boolean => roles.some((role) => MANAGE_ROLES.includes(role));

const authDisabled = () => (process.env.CHATAPI_AUTH || '').toLowerCase() === 'none';

/**
 * Origins allowed for credentialed CORS and WebSocket handshakes, from the
 * comma-separated CORS_ORIGINS env var. Empty means any origin is accepted —
 * fine when the gateway is only reachable same-origin behind nginx, but
 * cross-origin deployments should set it since chat auth rides on cookies.
 */
export const allowedOrigins = (): string[] =>
  (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);

export const isAuthRequired = (): boolean => !authDisabled();

export async function getSession(cookie: string | undefined): Promise<SessionInfo | null> {
  if (!cookie || !cookie.includes('AuthSession=')) {
    return null;
  }
  try {
    const response = await fetch(`${couchBaseUrl}/_session`, { 'headers': { cookie } });
    if (!response.ok) {
      return null;
    }
    const session = await response.json() as { userCtx?: { name?: string | null; roles?: string[] } };
    return session.userCtx?.name ? { 'name': session.userCtx.name, 'roles': session.userCtx.roles || [] } : null;
  } catch (error) {
    console.error(`chatapi: session validation failed: ${error}`);
    return null;
  }
}

export async function getSessionUser(cookie: string | undefined): Promise<string | null> {
  const session = await getSession(cookie);
  return session?.name || null;
}

export async function requireSession(req: Request, res: Response, next: NextFunction) {
  if (authDisabled()) {
    next();
    return;
  }
  const session = await getSession(req.headers.cookie);
  if (!session) {
    res.status(401).json({ 'error': 'Unauthorized', 'message': 'A valid Planet session is required' });
    return;
  }
  res.locals.user = session.name;
  res.locals.roles = session.roles;
  next();
}

/** Gate for destructive/costly routes; use after requireSession so roles are populated. */
export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (authDisabled()) {
    next();
    return;
  }
  const roles: string[] = res.locals.roles || [];
  if (!canManageResources(roles)) {
    res.status(403).json({ 'error': 'Forbidden', 'message': 'This operation requires a manager or admin account' });
    return;
  }
  next();
}
