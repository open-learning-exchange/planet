import { afterEach, describe, expect, it, vi } from 'vitest';
import OpenAI from 'openai';

import { HttpError, ProviderError, toHttpError } from './http-error';

describe('HTTP error normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves explicit HTTP errors', () => {
    const error = new HttpError(400, 'Invalid request', 'invalid_request');
    expect(toHttpError(error, 'Fallback')).toBe(error);
    expect(error.code).toEqual('invalid_request');
  });

  it('maps missing CouchDB documents to 404', () => {
    expect(toHttpError({ 'error': 'not_found' }, 'Fallback')).toMatchObject({
      'statusCode': 404,
      'message': 'Document not found'
    });
  });

  it('maps provider errors to a sanitized 502 response', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new OpenAI.APIError(
      401,
      { 'message': 'Incorrect API key provided: sk-proj-secret' },
      undefined,
      { 'x-request-id': 'req_123' }
    );
    expect(toHttpError(error, 'Fallback')).toMatchObject({
      'statusCode': 502,
      'message': 'AI provider request failed'
    });
    expect(consoleError).toHaveBeenCalledWith('chatapi: AI provider request failed (status 401, request req_123)');
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('sk-proj-secret'));
  });

  it('maps provider response failures to a sanitized 502 response', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toHttpError(new ProviderError('quota exceeded'), 'Fallback')).toMatchObject({
      'statusCode': 502,
      'message': 'AI provider request failed'
    });
    expect(consoleError).toHaveBeenCalledWith('chatapi: AI provider request failed: quota exceeded');
  });

  it('keeps provider diagnostics on one bounded log line', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    toHttpError(new ProviderError(`first line\n${'x'.repeat(600)}`), 'Fallback');
    const logged = consoleError.mock.calls[0][0] as string;
    expect(logged).not.toContain('\n');
    expect(logged.length).toBeLessThanOrEqual(537);
  });

  it('maps caller cancellation without logging a provider outage', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toHttpError(new OpenAI.APIUserAbortError(), 'Fallback')).toMatchObject({
      'statusCode': 499,
      'message': 'AI provider request cancelled'
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('maps SDK connection timeouts to a sanitized 504 response', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new OpenAI.APIConnectionTimeoutError({ 'message': 'request timed out with secret details' });
    expect(toHttpError(error, 'Fallback')).toMatchObject({
      'statusCode': 504,
      'message': 'AI provider request timed out'
    });
    expect(consoleError).toHaveBeenCalledWith('chatapi: AI provider request timed out');
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining('secret details'));
  });

  it('does not classify unrelated HTTP-shaped errors as provider failures', () => {
    const error = Object.assign(new SyntaxError('Malformed JSON'), { 'status': 400 });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toHttpError(error, 'Invalid request body')).toMatchObject({
      'statusCode': 500,
      'message': 'Invalid request body'
    });
    expect(consoleError).toHaveBeenCalledWith('chatapi: unexpected internal error', error);
  });

  it('uses a fallback for unknown errors', () => {
    const error = { 'message': 'Internal database host details' };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(toHttpError(error, 'Unexpected failure')).toMatchObject({
      'statusCode': 500,
      'message': 'Unexpected failure'
    });
    expect(consoleError).toHaveBeenCalledWith('chatapi: unexpected internal error', error);
  });
});
