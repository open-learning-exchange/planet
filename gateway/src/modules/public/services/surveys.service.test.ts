import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Request } from 'express';

const mocks = vi.hoisted(() => ({
  'getSurvey': vi.fn(),
  'getTeam': vi.fn(),
  'listConfigurations': vi.fn(),
  'insertSubmission': vi.fn()
}));

vi.mock('../../../config/couch.config', () => ({
  'configurationDB': { 'list': mocks.listConfigurations },
  'examsDB': { 'get': mocks.getSurvey },
  'submissionsDB': { 'insert': mocks.insertSubmission },
  'teamsDB': { 'get': mocks.getTeam }
}));

import { createPublicSurveySubmission, getPublicSurvey } from './surveys.service';

const well = { 'id': 'a', 'text': 'Well' };
const tap = { 'id': 'b', 'text': 'Tap' };

const publicSurvey = {
  '_id': 'survey-1',
  '_rev': '1-a',
  'name': 'Water access',
  'questions': [
    { 'body': 'Main water source?', 'type': 'select', 'choices': [ well, tap ], 'correctChoice': 'b', 'marks': 1 },
    { 'body': 'How many people live with you?', 'type': 'input' }
  ],
  'type': 'surveys',
  'teamId': 'team-1',
  'publicAccess': true
};

const request = (body?: object) => ({ 'params': { 'teamId': 'team-1', 'surveyId': 'survey-1' }, body }) as unknown as Request;

const response = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe('public surveys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSurvey.mockResolvedValue(publicSurvey);
    mocks.getTeam.mockResolvedValue({ '_id': 'team-1', 'name': 'Water committee' });
    mocks.listConfigurations.mockResolvedValue({ 'rows': [ { 'doc': { 'code': 'planet-1', 'parentCode': 'earth' } } ] });
  });

  it.each([
    { 'state': 'not public', 'override': { 'publicAccess': false } },
    { 'state': 'archived', 'override': { 'isArchived': true } },
    { 'state': 'from another team', 'override': { 'teamId': 'team-2' } }
  ])('hides a survey that is $state from reading and submitting', async ({ override }) => {
    mocks.getSurvey.mockResolvedValue({ ...publicSurvey, ...override });
    const read = response();
    const submit = response();

    await getPublicSurvey(request(), read);
    await createPublicSurveySubmission(request({ 'answers': [ tap, '4' ] }), submit);

    expect(read.status).toHaveBeenCalledWith(404);
    expect(submit.status).toHaveBeenCalledWith(404);
    expect(mocks.insertSubmission).not.toHaveBeenCalled();
  });

  it('serves a public survey without its answer key', async () => {
    const res = response();

    await getPublicSurvey(request(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].survey.questions).toEqual([
      { 'body': 'Main water source?', 'type': 'select', 'choices': [ well, tap ] },
      { 'body': 'How many people live with you?', 'type': 'input' }
    ]);
  });
});
