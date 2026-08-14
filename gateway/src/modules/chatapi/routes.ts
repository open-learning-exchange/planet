import { Express, Request, Response } from 'express';

import { requireSession, SessionInfo } from './middleware/auth';
import { rateLimit } from './middleware/rate-limit';
import { ChatRequestPayload, isNonEmptyObject, PROVIDER_NAMES } from './models/chat.model';
import { defaultPromptProfiles } from './prompts/default-prompts';
import { providerCapabilities } from './providers';
import { analyze } from './services/analyze.service';
import { chat } from './services/chat.service';
import { getAIConfig } from './services/config.service';
import {
  deleteResourceIndex,
  FILE_SEARCH_CONTENT_TYPES,
  getOpenAIIndexClient
} from './services/resource-index.service';
import { HttpError, httpErrorName, toHttpError } from './utils/http-error';

const MAX_RESOURCE_CLEANUP_BATCH = 500;
const MAX_RESOURCE_CLEANUP_REQUESTS_PER_MINUTE = 5;
const RESOURCE_CLEANUP_BUDGET_MS = 10000;
const RESOURCE_CLEANUP_ROUTE = '/resources/indexes/cleanup';
const RESOURCE_CLEANUP_RATE_LABEL = 'resource-index-cleanup';

const canWriteResponse = (res: Response): boolean => !res.headersSent && !res.writableEnded && !res.destroyed;

const handleError = (res: Response, error: any) => {
  if (!canWriteResponse(res)) {
    return;
  }
  const httpError = toHttpError(error, 'Unexpected error');
  res.status(httpError.statusCode).json({
    'error': httpErrorName(httpError.statusCode),
    'message': httpError.message,
    ...(httpError.code ? { 'code': httpError.code } : {})
  });
};

const requestCancellation = (req: Request, res: Response) => {
  const controller = new AbortController();
  const abort = () => controller.abort(new Error('Client disconnected'));
  const abortIfUnfinished = () => {
    if (!res.writableEnded) {
      abort();
    }
  };
  req.once('aborted', abort);
  res.once('close', abortIfUnfinished);
  return {
    controller,
    'cleanup': () => {
      req.off('aborted', abort);
      res.off('close', abortIfUnfinished);
    }
  };
};

export function registerChatApiRoutes(app: Express) {
  app.post('/', requireSession, rateLimit(undefined, 'chat'), async (req: Request, res: Response) => {
    const { data, save } = req.body;
    if (!isNonEmptyObject(data)) {
      return res.status(400).json({ 'error': 'Bad Request', 'message': 'The "data" field must be a non-empty object' });
    }
    const cancellation = requestCancellation(req, res);
    try {
      const outcome = await chat(data as unknown as ChatRequestPayload, {
        'save': !!save,
        'sessionUser': res.locals.user,
        'signal': cancellation.controller.signal
      });
      if (!canWriteResponse(res) || cancellation.controller.signal.aborted) {
        return;
      }
      return res.status(save ? 201 : 200).json({
        'status': 'Success',
        'chat': outcome.completionText,
        'citations': outcome.citations,
        ...(save ? { 'couchDBResponse': outcome.couchSaveResponse } : {})
      });
    } catch (error) {
      if (!cancellation.controller.signal.aborted) {
        return handleError(res, error);
      }
    } finally {
      cancellation.cleanup();
    }
  });

  app.get('/checkproviders', requireSession, rateLimit(), async (req: Request, res: Response) => {
    void req;
    try {
      const config = await getAIConfig(true);
      const providers = PROVIDER_NAMES.reduce((result, name) => {
        const capabilities = providerCapabilities(name);
        result[name] = {
          'enabled': config.providers[name].enabled,
          capabilities,
          'fileSearchContentTypes': capabilities.includes('fileSearch') ? [ ...FILE_SEARCH_CONTENT_TYPES ] : []
        };
        return result;
      }, {} as Record<string, { enabled: boolean; capabilities: string[]; fileSearchContentTypes: string[] }>);
      res.status(200).json({ providers, 'promptDefaults': defaultPromptProfiles });
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/analyze', requireSession, rateLimit(), async (req: Request, res: Response) => {
    const cancellation = requestCancellation(req, res);
    try {
      const result = await analyze(req.body, cancellation.controller.signal);
      if (canWriteResponse(res) && !cancellation.controller.signal.aborted) {
        res.status(200).json({ 'status': 'Success', ...result });
      }
    } catch (error) {
      if (!cancellation.controller.signal.aborted) {
        handleError(res, error);
      }
    } finally {
      cancellation.cleanup();
    }
  });

  // eslint-disable-next-line max-len
  app.post(RESOURCE_CLEANUP_ROUTE, requireSession, rateLimit(MAX_RESOURCE_CLEANUP_REQUESTS_PER_MINUTE, RESOURCE_CLEANUP_RATE_LABEL), async (req: Request, res: Response) => {
    const resourceIds = req.body?.resourceIds;
    if (!Array.isArray(resourceIds) || resourceIds.length === 0 ||
      resourceIds.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
      return res.status(400).json({
        'error': 'Bad Request',
        'message': '"resourceIds" must be a non-empty array of resource IDs'
      });
    }
    const uniqueResourceIds = [ ...new Set<string>(resourceIds) ];
    if (uniqueResourceIds.length > MAX_RESOURCE_CLEANUP_BATCH) {
      return res.status(413).json({
        'error': 'Payload Too Large',
        'message': `At most ${MAX_RESOURCE_CLEANUP_BATCH} resource indexes can be cleaned in one request`
      });
    }
    const requester: SessionInfo | undefined = res.locals.user
      ? { 'name': res.locals.user, 'roles': res.locals.roles || [] }
      : undefined;
    const cancellation = requestCancellation(req, res);
    let deadlineReached = false;
    const deadline = setTimeout(() => {
      deadlineReached = true;
      cancellation.controller.abort(new HttpError(504, 'Resource index cleanup deadline reached'));
    }, RESOURCE_CLEANUP_BUDGET_MS);
    let clientPromise: ReturnType<typeof getOpenAIIndexClient> | undefined;
    const getClient = () => clientPromise ||= getOpenAIIndexClient();
    const results: Array<{ resourceId: string; removed: boolean; deferred?: boolean; failed?: boolean }> = [];
    const deferRemaining = (startIndex: number) => {
      for (const resourceId of uniqueResourceIds.slice(startIndex)) {
        results.push({ resourceId, 'removed': false, 'deferred': true });
      }
    };
    try {
      for (let index = 0; index < uniqueResourceIds.length; index++) {
        const resourceId = uniqueResourceIds[index];
        if (cancellation.controller.signal.aborted) {
          if (deadlineReached) {
            deferRemaining(index);
          }
          break;
        }
        try {
          const { removed } = await deleteResourceIndex(
            getClient,
            resourceId,
            requester,
            cancellation.controller.signal
          );
          results.push({ resourceId, removed });
        } catch (error) {
          if (deadlineReached) {
            deferRemaining(index);
            break;
          }
          if (cancellation.controller.signal.aborted) {
            break;
          }
          void toHttpError(error, 'Index cleanup failed');
          results.push({ resourceId, 'removed': false, 'failed': true });
        }
      }
      if (canWriteResponse(res)) {
        return res.status(200).json({ 'status': 'Success', results });
      }
    } catch (error) {
      if (!cancellation.controller.signal.aborted) {
        return handleError(res, error);
      }
    } finally {
      clearTimeout(deadline);
      cancellation.cleanup();
    }
  });

}
