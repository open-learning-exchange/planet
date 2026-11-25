import { Express, NextFunction, Request, Response } from 'express';

import { anonymousConfigurationDB } from '../../config/couch.config';

const readParentHost = async (): Promise<string> => {
  const { docs } = await anonymousConfigurationDB.find({
    'selector': { '_id': { '$gt': null } }, 'fields': [ 'parentDomain' ], 'limit': 1
  });
  const parentDomain = docs[0]?.parentDomain;
  return typeof parentDomain === 'string' ? parentDomain.split('/')[0].toLowerCase() : '';
};

// nginx asks before each /parent/<host>/ request, so a planet only forwards to its own parent
export function registerParentRoutes(app: Express) {
  app.get('/parent-check', (req: Request, res: Response, next: NextFunction) => {
    readParentHost().then((parentHost) => {
      res.sendStatus(parentHost && parentHost === req.get('x-parent-host') ? 204 : 403);
    }).catch(next);
  });
}
