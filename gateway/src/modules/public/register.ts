import { Express, NextFunction, Request, Response } from 'express';

import { createPublicSurveySubmission, getPublicSurvey } from './services/surveys.service';

export function registerPublicRoutes(app: Express) {
  app.get('/public/surveys/:teamId/:surveyId', (req: Request, res: Response, next: NextFunction) => {
    getPublicSurvey(req, res).catch(next);
  });

  app.post('/public/surveys/:teamId/:surveyId/submissions', (req: Request, res: Response, next: NextFunction) => {
    createPublicSurveySubmission(req, res).catch(next);
  });
}
