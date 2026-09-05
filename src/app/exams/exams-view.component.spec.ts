import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ExamsViewComponent } from './exams-view.component';

describe('ExamsViewComponent', () => {
  let couchService: any;
  let submissionsService: any;
  let planetMessageService: any;
  let router: any;
  let route: any;
  let component: ExamsViewComponent;

  const paramMapOf = (params: any) => ({
    get: (key: string) => (params[key] !== undefined ? params[key] : null),
    has: (key: string) => params[key] !== undefined
  });

  const createComponent = (params: any = {}) => {
    route = {
      snapshot: { data: { newUser: true }, params, paramMap: paramMapOf(params), url: [] }
    };
    return new ExamsViewComponent(
      router,
      route,
      {} as any,
      submissionsService,
      { get: vi.fn().mockReturnValue({ name: 'user' }) } as any,
      couchService,
      planetMessageService,
      {} as any,
      { start: vi.fn(), stop: vi.fn() } as any,
      new FormBuilder(),
      {} as any
    );
  };

  beforeEach(() => {
    couchService = {
      get: vi.fn((path: string) => of(
        path.startsWith('teams/') ?
          { _id: 'team-1', name: 'Team One', type: 'team' } :
          { _id: 'survey-1', name: 'Survey 1', type: 'surveys', questions: [ { body: 'Q1' } ] }
      ))
    };
    submissionsService = { openSubmission: vi.fn() };
    planetMessageService = { showAlert: vi.fn() };
    router = { navigate: vi.fn(), url: '/surveys/dispense' };
  });

  it('opens a survey for recording without creating a submission first', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1', surveyTeamId: 'team-1' };
    component = createComponent(params);

    component.setExam(paramMapOf(params));

    expect(couchService.get).toHaveBeenCalledWith('exams/survey-1');
    expect(couchService.get).toHaveBeenCalledWith('teams/team-1');
    expect(submissionsService.openSubmission).toHaveBeenCalledWith({
      parentId: 'survey-1',
      parent: expect.objectContaining({ _id: 'survey-1' }),
      user: {},
      type: 'survey',
      team: { _id: 'team-1', name: 'Team One', type: 'team' }
    });
    expect(component.title).toBe('Survey 1');
  });

  it('records a survey with no team when none is in the route', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);

    component.setExam(paramMapOf(params));

    expect(couchService.get).toHaveBeenCalledTimes(1);
    expect(submissionsService.openSubmission).toHaveBeenCalledWith(expect.objectContaining({ team: undefined }));
  });

  it('alerts and leaves when the survey cannot be opened', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    couchService.get.mockReturnValue(throwError(() => new Error('failed')));

    component.setExam(paramMapOf(params));

    expect(planetMessageService.showAlert).toHaveBeenCalledWith('There was a problem recording the survey.');
    expect(submissionsService.openSubmission).not.toHaveBeenCalled();
  });

  it('continues a recording already under way instead of starting a second one', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    submissionsService.submission = {
      parentId: 'survey-1',
      status: 'pending',
      parent: { name: 'Survey 1', questions: [ { body: 'Q1' } ] }
    };
    submissionsService.resumeSubmission = vi.fn();

    component.setExam(paramMapOf(params));

    expect(submissionsService.resumeSubmission).toHaveBeenCalled();
    expect(couchService.get).not.toHaveBeenCalled();
    expect(submissionsService.openSubmission).not.toHaveBeenCalled();
  });

  it('adds the submission to the url once the first answer has created it', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);

    expect(component.examParams()).toEqual(params);

    component.submissionId = 'submission-1';

    expect(component.examParams()).toEqual({ ...params, submissionId: 'submission-1', status: 'pending' });
  });

  it('keeps the url unchanged for a submission opened directly', () => {
    const params = { submissionId: 'submission-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    component.submissionId = 'submission-1';

    expect(component.examParams()).toEqual(params);
  });
});
