import { Request, Response } from 'express';

import { configurationDB, examsDB, submissionsDB, teamsDB } from '../../../config/couch.config';

type TeamDoc = {
  _id: string;
  name: string;
  type?: string;
};

type SurveyDoc = {
  _id: string;
  _rev: string;
  name: string;
  description?: string;
  questions: any[];
  type: string;
  teamId: string;
  publicAccess?: boolean;
  isArchived?: boolean;
};

type ConfigurationDoc = {
  code?: string;
  parentCode?: string;
};

type PublicSubmissionPayload = {
  answers?: any[];
  user?: {
    age?: number;
    gender?: string;
  };
};

type StoredPublicAnswer = {
  value: any;
  mistakes: number;
  passed: boolean;
};

const PUBLIC_SURVEY_TYPES = new Set([ 'survey', 'surveys' ]);

const fetchDoc = async <T>(db: any, id: string): Promise<T | null> => {
  try {
    return await db.get(id) as T;
  } catch (error: any) {
    if (error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
};

const fetchConfiguration = async (): Promise<ConfigurationDoc | null> => {
  try {
    const result = await configurationDB.list({ 'include_docs': true, 'limit': 1 });
    return (result.rows[0]?.doc as ConfigurationDoc) || null;
  } catch {
    return null;
  }
};

const isPublicSurvey = (survey: SurveyDoc | null, teamId: string): survey is SurveyDoc => !!survey &&
    PUBLIC_SURVEY_TYPES.has(survey.type) &&
    survey.teamId === teamId &&
    survey.publicAccess === true &&
    survey.isArchived !== true &&
    Array.isArray(survey.questions) &&
    survey.questions.length > 0;

const sanitizePublicQuestion = (question: any) => {
  const { correctChoice, marks, ...publicQuestion } = question || {};
  void correctChoice;
  void marks;
  return publicQuestion;
};

const sanitizePublicSurvey = (survey: SurveyDoc) => ({
  '_id': survey._id,
  'name': survey.name,
  'description': survey.description || '',
  'questions': survey.questions.map((question) => sanitizePublicQuestion(question)),
  'type': 'survey'
});

const sanitizeSurveySnapshot = (survey: SurveyDoc) => ({
  '_id': survey._id,
  '_rev': survey._rev,
  'name': survey.name,
  'description': survey.description || '',
  'questions': survey.questions,
  'type': survey.type
});

const sanitizeTeam = (team: TeamDoc) => ({
  '_id': team._id,
  'name': team.name,
  'type': team.type || 'team'
});

const isValidAnswer = (answer: any) => {
  if (Array.isArray(answer)) {
    return answer.length > 0;
  }
  return answer !== undefined && answer !== null && answer !== '';
};

const normalizeAnswers = (answers: any[] = []): StoredPublicAnswer[] => answers.map((answer) => ({
  'value': answer,
  'mistakes': 0,
  'passed': isValidAnswer(answer)
}));

const sanitizePublicSubmissionUser = (user: PublicSubmissionPayload['user']) => {
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    return {};
  }

  const sanitizedUser: NonNullable<PublicSubmissionPayload['user']> = {};
  const age = user.age;
  const gender = typeof user.gender === 'string' ? user.gender.trim() : '';

  if (typeof age === 'number' && Number.isInteger(age) && age >= 0 && age <= 130) {
    sanitizedUser.age = age;
  }

  if (gender === 'male' || gender === 'female') {
    sanitizedUser.gender = gender;
  }

  return sanitizedUser;
};

const buildPublicSubmission = (
  survey: SurveyDoc,
  team: TeamDoc,
  payload: PublicSubmissionPayload,
  configuration: ConfigurationDoc | null
) => {
  const now = Date.now();
  return {
    'parentId': survey._id,
    'parent': sanitizeSurveySnapshot(survey),
    'user': sanitizePublicSubmissionUser(payload.user),
    'type': 'survey',
    'answers': normalizeAnswers(payload.answers),
    'grade': 0,
    'status': 'complete',
    'team': sanitizeTeam(team),
    'source': configuration?.code || '',
    'parentCode': configuration?.parentCode || '',
    'startTime': now,
    'lastUpdateTime': now
  };
};

export const getPublicSurvey = async (req: Request, res: Response) => {
  const { teamId, surveyId } = req.params as { teamId: string; surveyId: string };
  const [ survey, team ] = await Promise.all([
    fetchDoc<SurveyDoc>(examsDB, surveyId),
    fetchDoc<TeamDoc>(teamsDB, teamId)
  ]);

  if (!team || !isPublicSurvey(survey, teamId)) {
    return res.status(404).json({
      'error': 'Not Found',
      'message': 'Survey not found or not public'
    });
  }

  return res.status(200).json({
    'survey': sanitizePublicSurvey(survey),
    'team': sanitizeTeam(team)
  });
};

export const createPublicSurveySubmission = async (req: Request, res: Response) => {
  const { teamId, surveyId } = req.params as { teamId: string; surveyId: string };
  const payload = (req.body || {}) as PublicSubmissionPayload;
  const { answers } = payload;

  if (!Array.isArray(answers)) {
    return res.status(400).json({
      'error': 'Bad Request',
      'message': 'answers must be an array'
    });
  }

  const [ survey, team, configuration ] = await Promise.all([
    fetchDoc<SurveyDoc>(examsDB, surveyId),
    fetchDoc<TeamDoc>(teamsDB, teamId),
    fetchConfiguration()
  ]);

  if (!team || !isPublicSurvey(survey, teamId)) {
    return res.status(404).json({
      'error': 'Not Found',
      'message': 'Survey not found or not public'
    });
  }

  if (answers.length !== survey.questions.length) {
    return res.status(400).json({
      'error': 'Bad Request',
      'message': 'answers must contain one entry per survey question'
    });
  }

  if (!answers.every((answer) => isValidAnswer(answer))) {
    return res.status(400).json({
      'error': 'Bad Request',
      'message': 'answers must include a response for each survey question'
    });
  }

  const submission = buildPublicSubmission(survey, team, payload, configuration);
  const response = await submissionsDB.insert(submission as any);

  return res.status(201).json({
    'status': 'Success',
    'id': response.id,
    'rev': response.rev
  });
};
