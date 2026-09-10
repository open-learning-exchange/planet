import { Express, NextFunction, Request, Response } from 'express';

import { getCurrencyRate } from './services/currency.service';


export function registerCurrencyRoutes(app: Express) {
  app.get('/currency', (req: Request, res: Response, next: NextFunction) => {
    getCurrencyRate(req, res).catch(next);
  });
}
