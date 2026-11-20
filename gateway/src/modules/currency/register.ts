import { NextFunction, Request, Response, Router } from 'express';

import { getCurrencyRate } from './services/currency.service';


export function registerCurrencyRoutes(app: Router) {
  app.get('/currency/:timestamp?', (req: Request, res: Response, next: NextFunction) => {
    getCurrencyRate(req, res).catch(next);
  });
}
