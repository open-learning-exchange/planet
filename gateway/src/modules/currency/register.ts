import { Express, NextFunction, Request, Response } from 'express';

import { getCurrencyRate, submitTransaction } from './services/currency.service';


export function registerCurrencyRoutes(app: Express) {
  app.get('/currency/:timestamp?', (req: Request, res: Response, next: NextFunction) => {
    getCurrencyRate(req, res).catch(next);
  });

  // POST /currency/transaction - Create or update a transaction
  app.post('/currency/transaction', (req: Request, res: Response, next: NextFunction) => {
    submitTransaction(req, res).catch(next);
  });
}
