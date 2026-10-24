import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { allowedOrigins, browserCors, isTrustedOrigin, requestScheme } from './origin';

const corsHeaders = async (origin: string) => {
  const headers = new Map<string, unknown>();
  const req: any = { 'method': 'GET', 'headers': { origin, 'host': 'planet.local:5000' } };
  const res: any = {
    'getHeader': (name: string) => headers.get(name.toLowerCase()),
    'setHeader': (name: string, value: unknown) => headers.set(name.toLowerCase(), value)
  };
  await new Promise<void>((resolve, reject) => browserCors(req, res, (error?: unknown) => error ? reject(error) : resolve()));
  return headers;
};

describe('gateway origin policy', () => {
  beforeEach(() => {
    delete process.env.CORS_ORIGINS;
  });

  afterEach(() => {
    delete process.env.CORS_ORIGINS;
  });

  it('parses only configured cross-origin additions, normalized to browser origins', () => {
    expect(allowedOrigins()).toEqual([]);
    process.env.CORS_ORIGINS = ' http://localhost:3000/, https://planet.example:443 , not-a-url, ';
    expect(allowedOrigins()).toEqual([ 'http://localhost:3000', 'https://planet.example' ]);
  });

  it('trusts the exact request host, port included, and configured origins only', () => {
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example:8443', 'https')).toEqual(true);
    expect(isTrustedOrigin('https://planet.example:8443', 'Planet.Example:8443', undefined)).toEqual(true);
    expect(isTrustedOrigin('https://planet.example', 'planet.example:443', 'https')).toEqual(true);
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example', 'https')).toEqual(false);
    process.env.CORS_ORIGINS = 'https://planet.example:8443';
    expect(isTrustedOrigin('https://planet.example:8443', 'planet.example', 'https')).toEqual(true);
    expect(isTrustedOrigin('not a URL', 'planet.example', 'https')).toEqual(false);
  });

  it('requires a matching scheme only when a proxy reports one', () => {
    expect(isTrustedOrigin('http://planet.example', 'planet.example', 'https')).toEqual(false);
    expect(isTrustedOrigin('https://planet.example', 'planet.example', undefined)).toEqual(true);
  });

  it('reads the first forwarded scheme and nothing when there is none', () => {
    expect(requestScheme({ 'x-forwarded-proto': 'https, http' })).toEqual('https');
    expect(requestScheme({ 'x-forwarded-proto': 'wss' })).toEqual('https');
    expect(requestScheme({})).toBeUndefined();
  });

  it('reflects trusted CORS origins only', async () => {
    process.env.CORS_ORIGINS = 'http://localhost:3000';
    const trusted = await corsHeaders('http://localhost:3000');
    const untrusted = await corsHeaders('http://evil.test');

    expect(trusted.get('access-control-allow-origin')).toEqual('http://localhost:3000');
    expect(trusted.get('access-control-allow-credentials')).toEqual('true');
    expect(untrusted.has('access-control-allow-origin')).toEqual(false);
  });
});
