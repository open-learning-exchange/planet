import { NextFunction, Request, Response, Router } from 'express';

import { createPublicSurveySubmission, getPublicSurvey } from './services/surveys.service';

export function registerPublicRoutes(app: Router) {
  app.get('/public/surveys/:teamId/:surveyId', (req: Request, res: Response, next: NextFunction) => {
    getPublicSurvey(req, res).catch(next);
  });

  app.post('/public/surveys/:teamId/:surveyId/submissions', (req: Request, res: Response, next: NextFunction) => {
    createPublicSurveySubmission(req, res).catch(next);
  });
}
