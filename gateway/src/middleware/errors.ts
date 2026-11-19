import { STATUS_CODES } from 'http';
import { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const toHttpError = (error: any): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }
  // body-parser's refusals, such as malformed JSON
  if (error?.expose && error.statusCode < 500) {
    return new HttpError(error.statusCode, error.message);
  }
  if (error?.statusCode === 404) {
    return new HttpError(404, 'Not found');
  }
  if (error?.statusCode === 409) {
    return new HttpError(409, 'Changed by another request; try again');
  }
  // Not the error itself: nano attaches the request to it, body and all
  console.error('Unexpected gateway error:', error?.stack ?? error); // eslint-disable-line no-console
  return new HttpError(500, 'Unexpected error');
};

export function respondWithError(error: any, req: Request, res: Response, next: NextFunction) {
  void req;
  void next;
  const { statusCode, message } = toHttpError(error);
  res.status(statusCode).json({ 'error': STATUS_CODES[statusCode], message });
}
