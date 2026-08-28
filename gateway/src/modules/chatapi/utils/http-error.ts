/* eslint-disable no-console */
import OpenAI from 'openai';

export class HttpError extends Error {
  statusCode: number;
  code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Marks failures originating from provider responses without exposing them to clients. */
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderError';
  }
}

export const httpErrorName = (statusCode: number): string => {
  switch (statusCode) {
  case 400: return 'Bad Request';
  case 401: return 'Unauthorized';
  case 403: return 'Forbidden';
  case 404: return 'Not Found';
  case 409: return 'Conflict';
  case 413: return 'Payload Too Large';
  case 429: return 'Too Many Requests';
  case 499: return 'Client Closed Request';
  case 502: return 'Bad Gateway';
  case 503: return 'Service Unavailable';
  case 504: return 'Gateway Timeout';
  default: return 'Internal Server Error';
  }
};

const isCouchMissing = (error: any): boolean =>
  error?.message === 'missing' || error?.message === 'deleted' || error?.statusCode === 404 || error?.error === 'not_found';

const providerLogMessage = (message: string): string => message.replace(/[\r\n]+/g, ' ').slice(0, 500);

/** Normalize CouchDB, provider SDK, and generic errors for route handling. */
export const toHttpError = (error: any, fallbackMessage: string): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }
  if (isCouchMissing(error)) {
    return new HttpError(404, 'Document not found');
  }
  if (error instanceof ProviderError) {
    console.error(`chatapi: AI provider request failed: ${providerLogMessage(error.message)}`);
    return new HttpError(502, 'AI provider request failed');
  }
  if (error instanceof OpenAI.APIUserAbortError) {
    return new HttpError(499, 'AI provider request cancelled');
  }
  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    console.error('chatapi: AI provider request timed out');
    return new HttpError(504, 'AI provider request timed out');
  }
  if (error instanceof OpenAI.APIError) {
    const status = typeof error.status === 'number' ? `status ${error.status}` : 'connection error';
    const requestId = typeof error.request_id === 'string' ? `, request ${error.request_id}` : '';
    console.error(`chatapi: AI provider request failed (${status}${requestId})`);
    return new HttpError(502, 'AI provider request failed');
  }
  console.error('chatapi: unexpected internal error', error);
  return new HttpError(500, fallbackMessage);
};
