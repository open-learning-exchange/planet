import { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { HttpError, respondWithError, toHttpError } from './errors';

describe('toHttpError', () => {
  it('keeps body-parser\'s refusals and CouchDB\'s missing and conflicting documents', () => {
    expect(toHttpError({ 'expose': true, 'statusCode': 400, 'message': 'Unexpected end of JSON input' }))
      .toMatchObject({ 'statusCode': 400, 'message': 'Unexpected end of JSON input' });
    expect(toHttpError({ 'statusCode': 404, 'error': 'not_found', 'message': 'deleted' })).toMatchObject({ 'statusCode': 404 });
    expect(toHttpError({ 'statusCode': 409, 'error': 'conflict', 'message': 'Document update conflict.' }))
      .toMatchObject({ 'statusCode': 409 });
  });

  it('answers anything else with 500 and logs only its stack', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = Object.assign(new Error('connect ECONNREFUSED 172.18.0.2:5984'), { 'request': { 'data': 'a member\'s conversation' } });

    expect(toHttpError(error)).toMatchObject({ 'statusCode': 500, 'message': 'Unexpected error' });
    expect(log).toHaveBeenCalledWith('Unexpected gateway error:', error.stack);
    log.mockRestore();
  });
});

describe('respondWithError', () => {
  it('answers the status with its reason phrase and the message', () => {
    const res = { 'status': vi.fn().mockReturnThis(), 'json': vi.fn() };

    respondWithError(new HttpError(504, 'The AI provider took too long to answer'), {} as Request, res as unknown as Response, vi.fn());

    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith({ 'error': 'Gateway Timeout', 'message': 'The AI provider took too long to answer' });
  });
});
