import cors from 'cors';
import { IncomingHttpHeaders } from 'http';

const WEBSOCKET_SCHEMES = new Map([ [ 'ws', 'http' ], [ 'wss', 'https' ] ]);

const normalizedOrigin = (value: string): string | undefined => {
  try {
    const origin = new URL(value).origin;
    return origin === 'null' ? undefined : origin;
  } catch (error) {
    return undefined;
  }
};

/** Browser origins trusted besides the gateway's own host, such as `ng serve` in development. */
export const allowedOrigins = (): string[] =>
  (process.env.CORS_ORIGINS || '').split(',')
    .map((origin) => normalizedOrigin(origin.trim()))
    .filter((origin): origin is string => !!origin);

/** The browser-facing scheme, when a proxy in front of the gateway reports one (some report `wss` for sockets). */
export const requestScheme = (headers: IncomingHttpHeaders): string | undefined => {
  const forwarded = headers['x-forwarded-proto'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const scheme = value?.split(',', 1)[0].trim().toLowerCase();
  return scheme ? WEBSOCKET_SCHEMES.get(scheme) || scheme : undefined;
};

// Read Host with the origin's scheme, so a proxy's `planet.example:443` still equals `https://planet.example`
const isSameHost = (origin: URL, host: string): boolean => {
  try {
    return new URL(`${origin.protocol}//${host}`).host === origin.host;
  } catch (error) {
    return false;
  }
};

export const isTrustedOrigin = (origin: string, host: string | undefined, scheme: string | undefined): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch (error) {
    return false;
  }
  if (host && (!scheme || parsed.protocol === `${scheme}:`) && isSameHost(parsed, host)) {
    return true;
  }
  return allowedOrigins().includes(parsed.origin);
};

// Browsers send Origin on every cross-origin request and WebSocket handshake, so a request without one isn't from another site's page
export const isAllowedOrigin = (headers: IncomingHttpHeaders): boolean =>
  !headers.origin || isTrustedOrigin(headers.origin, headers.host, requestScheme(headers));

// `[]` rather than `false`, so cors still answers an untrusted preflight and varies on Origin, allowing no origin
export const browserCors = cors((req, callback) => {
  callback(null, { 'origin': isAllowedOrigin(req.headers) ? true : [], 'credentials': true });
});
