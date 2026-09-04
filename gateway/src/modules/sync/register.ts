import { Express, Request, Response } from 'express';

import { getTimedSyncStatus, startTimedSyncScheduler } from './services/sync-scheduler.service';

export function registerSyncRoutes(app: Express) {
  app.get('/sync/status', (req: Request, res: Response) => {
    void req;
    res.status(200).json(getTimedSyncStatus());
  });
}

export { startTimedSyncScheduler };
