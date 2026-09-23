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
  let dialogsLoadingService: any;

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
      dialogsLoadingService,
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
    submissionsService = { openSubmission: vi.fn(), startNewSubmission: vi.fn(), resumeSubmission: vi.fn() };
    planetMessageService = { showAlert: vi.fn() };
    dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    router = { navigate: vi.fn(), url: '/surveys/dispense', getCurrentNavigation: vi.fn(), serializeUrl: vi.fn(url => url) };
  });

  it('opens a survey for recording without creating a submission first', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1', surveyTeamId: 'team-1' };
    component = createComponent(params);

    component.setExam(paramMapOf(params));

    expect(couchService.get).toHaveBeenCalledWith('exams/survey-1');
    expect(couchService.get).toHaveBeenCalledWith('teams/team-1');
    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith({
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
    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith(expect.objectContaining({ team: undefined }));
  });

  it('alerts and leaves when the survey cannot be opened', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    couchService.get.mockReturnValue(throwError(() => new Error('failed')));

    component.setExam(paramMapOf(params));

    expect(planetMessageService.showAlert).toHaveBeenCalledWith('There was a problem recording the survey.');
    expect(submissionsService.startNewSubmission).not.toHaveBeenCalled();
  });

  it('continues a recording already under way instead of starting a second one', () => {
    const params = { surveyId: 'survey-1', recordingId: 'recording-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    component.setExam(paramMapOf(params));
    submissionsService.submission = {
      parentId: 'survey-1',
      status: 'pending',
      parent: { name: 'Survey 1', questions: [ { body: 'Q1' } ] }
    };
    couchService.get.mockClear();
    submissionsService.startNewSubmission.mockClear();

    component.setExam(paramMapOf(params));

    expect(submissionsService.resumeSubmission).toHaveBeenCalled();
    expect(couchService.get).not.toHaveBeenCalled();
    expect(submissionsService.startNewSubmission).not.toHaveBeenCalled();
  });

  it('resumes Q1 after opening a saved question URL', () => {
    const savedParams = {
      surveyId: 'survey-1', recordingId: 'recording-1', submissionId: 'response-1',
      status: 'pending', mode: 'take', questionNum: '2'
    };
    component = createComponent(savedParams);
    component.setExam(paramMapOf(savedParams));
    submissionsService.submission = {
      _id: 'response-1', parentId: 'survey-1', status: 'pending',
      parent: { name: 'Survey 1', questions: [ { body: 'Q1' }, { body: 'Q2' } ] }
    };

    component.setExam(paramMapOf({ surveyId: 'survey-1', recordingId: 'recording-1', mode: 'take', questionNum: '1' }));

    expect(submissionsService.resumeSubmission).toHaveBeenCalledOnce();
    expect(submissionsService.startNewSubmission).not.toHaveBeenCalled();
  });

  it('starts a fresh recording when Record is clicked again for the same survey', () => {
    const params = { surveyId: 'survey-1', recordingId: 'recording-2', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    submissionsService.submission = {
      _id: 'old-response', parentId: 'survey-1', status: 'pending',
      parent: { name: 'Survey 1', questions: [ { body: 'Q1' } ] }
    };

    component.setExam(paramMapOf(params));

    expect(submissionsService.resumeSubmission).not.toHaveBeenCalled();
    expect(submissionsService.startNewSubmission).toHaveBeenCalledOnce();
  });

  it('does not resume a personal response from a team recording', () => {
    const params = { surveyId: 'survey-1', surveyTeamId: 'team-1', recordingId: 'recording-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    component.setExam(paramMapOf(params));
    submissionsService.submission = {
      _id: 'personal-response', parentId: 'survey-1', status: 'pending',
      parent: { name: 'Survey 1', questions: [ { body: 'Q1' } ] }
    };
    submissionsService.startNewSubmission.mockClear();

    component.setExam(paramMapOf(params));

    expect(submissionsService.resumeSubmission).not.toHaveBeenCalled();
    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith(expect.objectContaining({
      team: { _id: 'team-1', name: 'Team One', type: 'team' }
    }));
  });

  it('uses the carried Nation survey when it is unavailable locally', () => {
    const params = { surveyId: 'nation-survey', recordingId: 'recording-1', mode: 'take', questionNum: '1' };
    const survey = { _id: 'nation-survey', name: 'Nation survey', questions: [ { body: 'Q1' } ] };
    component = createComponent(params);
    couchService.get.mockReturnValue(throwError({ status: 404 }));
    router.getCurrentNavigation.mockReturnValue({ extras: { state: { recordingSurvey: survey } } });

    component.setExam(paramMapOf(params));

    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith(expect.objectContaining({ parent: survey }));
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('loads a Nation survey from a saved submission when the route has no snapshot', () => {
    const params = { surveyId: 'nation-survey', recordingId: 'recording-1', mode: 'take', questionNum: '1' };
    const survey = { _id: 'nation-survey', name: 'Nation survey', questions: [ { body: 'Q1' } ] };
    component = createComponent(params);
    couchService.get.mockReturnValue(throwError({ status: 404 }));
    couchService.post = vi.fn().mockReturnValue(of({ docs: [ { parent: survey } ] }));

    component.setExam(paramMapOf(params));

    expect(couchService.post).toHaveBeenCalledWith('submissions/_find', { selector: { parentId: 'nation-survey' }, limit: 1 });
    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith(expect.objectContaining({ parent: survey }));
  });

  it('treats Back to Q1 as the same recording after its first save', () => {
    component = createComponent();
    router.url = '/surveys/dispense;surveyId=survey-1;recordingId=recording-1;questionNum=2;submissionId=response-1;status=pending';
    router.getCurrentNavigation.mockReturnValue({ finalUrl: '/surveys/dispense;surveyId=survey-1;recordingId=recording-1;questionNum=1' });

    expect(component.isSameExamDestination()).toBe(true);

    router.getCurrentNavigation.mockReturnValue({ finalUrl: '/surveys/dispense;surveyId=survey-1;recordingId=recording-2;questionNum=1' });
    expect(component.isSameExamDestination()).toBe(false);
  });

  it.each([ 'nextQuestion', 'nextFromFrame' ])('reports a failed first save from %s', action => {
    component = createComponent();
    component.question = { correctChoice: '' } as any;
    component.questionNum = 1;
    component.maxQuestions = 2;
    submissionsService.submission = { status: 'pending' };
    submissionsService.submitAnswer = vi.fn().mockReturnValue(throwError(() => new Error('save failed')));

    component[action]();

    expect(planetMessageService.showAlert).toHaveBeenCalledWith('Your answer could not be saved');
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
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
