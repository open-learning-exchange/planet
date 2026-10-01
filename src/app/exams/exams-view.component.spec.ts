import { FormBuilder } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
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
  let dialog: any;
  let location: any;

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
      dialog,
      dialogsLoadingService,
      new FormBuilder(),
      {} as any,
      location
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
    submissionsService = { openSubmission: vi.fn(), startNewSubmission: vi.fn() };
    planetMessageService = { showAlert: vi.fn() };
    dialogsLoadingService = { start: vi.fn(), stop: vi.fn() };
    dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(false) }) };
    location = { replaceState: vi.fn() };
    router = {
      navigate: vi.fn(), createUrlTree: vi.fn(), url: '/surveys/dispense',
      getCurrentNavigation: vi.fn(), serializeUrl: vi.fn(url => url)
    };
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

  it.each([
    [ 'loads', (survey$: Subject<any>) => survey$.next({ _id: 'survey-1', name: 'Survey 1', questions: [ { body: 'Q1' } ] }) ],
    [ 'fails', (survey$: Subject<any>) => survey$.error(new Error('failed')) ]
  ])('ignores a survey that %s after the component is destroyed', (_, settle) => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    const survey$ = new Subject<any>();
    component = createComponent(params);
    couchService.get.mockReturnValue(survey$);

    component.setExam(paramMapOf(params));
    component.ngOnDestroy();
    settle(survey$);
    survey$.complete();

    expect(submissionsService.startNewSubmission).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('adds the submission ID to Q1 history before advancing to Q2', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: 1 };
    component = createComponent(params);
    component.questionNum = 1;
    component.submissionId = 'response-1';
    const q1Url = '/surveys/dispense;surveyId=survey-1;questionNum=1;submissionId=response-1;status=pending';
    router.createUrlTree.mockReturnValue(q1Url);

    component.moveQuestion(1);

    expect(location.replaceState).toHaveBeenCalledWith(q1Url, '', history.state);
    expect(router.navigate).toHaveBeenCalledWith([
      expect.objectContaining({ questionNum: 2, submissionId: 'response-1', status: 'pending' })
    ], { relativeTo: route });
    expect(location.replaceState.mock.invocationCallOrder[0]).toBeLessThan(router.navigate.mock.invocationCallOrder[0]);
  });

  it('opens the saved response when Q1 is reloaded with its submission ID', () => {
    const params = { surveyId: 'survey-1', submissionId: 'response-1', status: 'pending', mode: 'take', questionNum: '1' };
    component = createComponent(params);

    component.setExam(paramMapOf(params));

    expect(submissionsService.openSubmission).toHaveBeenCalledWith({ submissionId: 'response-1', status: 'pending' });
    expect(submissionsService.startNewSubmission).not.toHaveBeenCalled();
  });

  it('starts a fresh recording when Record is clicked again for the same survey', () => {
    const params = { surveyId: 'survey-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    submissionsService.submission = {
      _id: 'old-response', parentId: 'survey-1', status: 'pending',
      parent: { name: 'Survey 1', questions: [ { body: 'Q1' } ] }
    };

    component.setExam(paramMapOf(params));

    expect(submissionsService.startNewSubmission).toHaveBeenCalledOnce();
    expect(submissionsService.openSubmission).not.toHaveBeenCalled();
  });

  it('uses the carried Nation survey when it is unavailable locally', () => {
    const params = { surveyId: 'nation-survey', mode: 'take', questionNum: '1' };
    const survey = { _id: 'nation-survey', name: 'Nation survey', questions: [ { body: 'Q1' } ] };
    component = createComponent(params);
    couchService.get.mockReturnValue(throwError({ status: 404 }));
    router.getCurrentNavigation.mockReturnValue({ extras: { state: { recordingSurvey: survey } } });

    component.setExam(paramMapOf(params));

    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith(expect.objectContaining({ parent: survey }));
    expect(planetMessageService.showAlert).not.toHaveBeenCalled();
  });

  it('loads a Nation survey from a saved submission when the route has no snapshot', () => {
    const params = { surveyId: 'nation-survey', mode: 'take', questionNum: '1' };
    const survey = { _id: 'nation-survey', name: 'Nation survey', questions: [ { body: 'Q1' } ] };
    component = createComponent(params);
    couchService.get.mockReturnValue(throwError({ status: 404 }));
    couchService.post = vi.fn().mockReturnValue(of({ docs: [ { parent: survey } ] }));

    component.setExam(paramMapOf(params));

    expect(couchService.post).toHaveBeenCalledWith('submissions/_find', { selector: { parentId: 'nation-survey' }, limit: 1 });
    expect(submissionsService.startNewSubmission).toHaveBeenCalledWith(expect.objectContaining({ parent: survey }));
  });

  it('leaves an unanswered survey without promising a save', () => {
    component = createComponent({ surveyId: 'survey-1' });
    component.examType = 'survey';
    component.question = { correctChoice: '' } as any;

    expect(component.canDeactivate()).toBe(true);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('describes whether the current answer will be saved on exit', () => {
    component = createComponent({ surveyId: 'survey-1' });
    component.examType = 'survey';
    component.question = { correctChoice: '' } as any;
    component.answer.setValue('4');

    component.canDeactivate();
    expect(dialog.open.mock.calls[0][1].data.extraMessage).toBe('Your current answer will not be saved.');

    component = createComponent();
    component.examType = 'exam';
    component.question = { correctChoice: '' } as any;
    component.answer.setValue('4');
    component.canDeactivate();
    expect(dialog.open.mock.calls[1][1].data.extraMessage).toBe('Your answer will be saved.');
  });

  it('does not create a one-question survey response when leaving without finishing', async () => {
    component = createComponent({ surveyId: 'survey-1' });
    component.examType = 'survey';
    component.question = { correctChoice: '' } as any;
    component.questionNum = 1;
    component.answer.setValue('9');
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    submissionsService.submitAnswer = vi.fn();

    expect(await (component.canDeactivate() as any).toPromise()).toBe(true);
    expect(submissionsService.submitAnswer).not.toHaveBeenCalled();
  });

  it('warns before leaving a saved recording from an unanswered question', () => {
    component = createComponent({ surveyId: 'survey-1', submissionId: 'response-1' });
    component.examType = 'survey';
    component.submissionId = 'response-1';
    component.question = { correctChoice: '' } as any;

    component.canDeactivate();

    expect(dialog.open.mock.calls[0][1].data.extraMessage).toBe(
      'You cannot continue this response from the survey list after leaving.'
    );
  });

  it('keeps the leave prompt for an exam with no current answer', () => {
    component = createComponent();
    component.examType = 'exam';
    component.question = { correctChoice: '' } as any;

    component.canDeactivate();

    expect(dialog.open).toHaveBeenCalledOnce();
    expect(dialog.open.mock.calls[0][1].data.extraMessage).toBeUndefined();
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

    expect(component.questionRouteParams()).toEqual(params);

    component.submissionId = 'submission-1';

    expect(component.questionRouteParams()).toEqual({ ...params, submissionId: 'submission-1', status: 'pending' });
  });

  it('keeps the url unchanged for a submission opened directly', () => {
    const params = { submissionId: 'submission-1', mode: 'take', questionNum: '1' };
    component = createComponent(params);
    component.submissionId = 'submission-1';

    expect(component.questionRouteParams()).toEqual(params);
  });
});
