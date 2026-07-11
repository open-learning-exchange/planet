export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

const isCouchMissing = (error: any): boolean =>
  error?.message === 'missing' || error?.message === 'deleted' || error?.statusCode === 404 || error?.error === 'not_found';

/**
 * Normalizes CouchDB, OpenAI SDK and generic errors into an HttpError with a
 * meaningful status code instead of a blanket 500.
 */
export const toHttpError = (error: any, fallbackMessage: string): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }
  if (isCouchMissing(error)) {
    return new HttpError(404, 'Document not found');
  }
  // openai SDK APIError carries `status`; upstream failures surface as 502
  if (typeof error?.status === 'number') {
    return new HttpError(502, `AI provider error (${error.status}): ${error.message}`);
  }
  return new HttpError(500, error?.message || fallbackMessage);
};
