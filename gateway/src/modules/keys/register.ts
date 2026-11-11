/* eslint-disable no-console */
import { Express, NextFunction, Request, Response } from 'express';

import { requireManager } from '../../middleware/auth';
import { getKeys, KeyService, removeKey, setKey } from '../../services/keys.service';
import { PROVIDER_NAMES } from '../chatapi/providers/clients';
import { CURRENCY_PROVIDER } from '../currency/services/currency.service';

const KEY_NAMES = new Map<KeyService, readonly string[]>([
  [ 'ai', PROVIDER_NAMES ],
  [ 'currency', [ CURRENCY_PROVIDER ] ]
]);

const requireKnownKey = (req: Request, res: Response, next: NextFunction) =>
  KEY_NAMES.get(req.params.service as KeyService)?.includes(req.params.name) ?
    next() :
    res.status(404).json({ 'error': 'Not Found', 'message': 'Unknown key' });

const keyStatus = async () => {
  const status: Record<string, Record<string, boolean>> = {};
  for (const [ service, names ] of KEY_NAMES) {
    const keys = await getKeys(service);
    status[service] = {};
    for (const name of names) {
      status[service][name] = !!keys[name];
    }
  }
  return status;
};

const respondToWrite = (res: Response, write: Promise<void>) => write.then(() => res.status(204).end(), (error) => {
  console.error(`Error saving a provider key: ${error}`);
  res.status(503).json({ 'error': 'Service Unavailable', 'message': 'The key could not be saved' });
});

export function registerKeyRoutes(app: Express) {
  app.use('/keys', requireManager);

  app.get('/keys', (req: Request, res: Response, next: NextFunction) => {
    keyStatus().then((status) => res.status(200).json(status)).catch(next);
  });

  app.put('/keys/:service/:name', requireKnownKey, (req: Request, res: Response) => {
    const key = typeof req.body?.key === 'string' ? req.body.key.trim() : '';
    if (!key) {
      return res.status(400).json({ 'error': 'Bad Request', 'message': 'The "key" field must be a non-empty string' });
    }
    return respondToWrite(res, setKey(req.params.service as KeyService, req.params.name, key));
  });

  app.delete('/keys/:service/:name', requireKnownKey, (req: Request, res: Response) =>
    respondToWrite(res, removeKey(req.params.service as KeyService, req.params.name)));
}
