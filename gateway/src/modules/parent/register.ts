import { Express, NextFunction, Request, Response } from 'express';

import { getCurrentConfiguration } from '../../services/config.service';

// nginx asks before each /parent/<host>/ request, so a planet only forwards to its own parent
export function registerParentRoutes(app: Express) {
  app.get('/parent-check', (req: Request, res: Response, next: NextFunction) => {
    getCurrentConfiguration().then(({ parentDomain }) => {
      const parentHost = parentDomain.split('/')[0].toLowerCase();
      res.sendStatus(parentHost && parentHost === req.get('x-parent-host') ? 204 : 403);
    }).catch(next);
  });
}
