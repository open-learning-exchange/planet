import { NonNullableFormBuilder } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { SurveysComponent } from './surveys.component';
import { DeviceType } from '../shared/device-info.service';

describe('SurveysComponent', () => {
  let couchService: any;
  let submissionsService: any;
  let planetMessageService: any;
  let dialogsLoadingService: any;
  let router: any;
  let route: any;
  let stateService: any;
  let component: SurveysComponent;

  const createComponent = () => new SurveysComponent(
    couchService,
    submissionsService,
    planetMessageService,
    {} as any,
    router,
    route,
    stateService,
    dialogsLoadingService,
    { doesUserHaveRole: vi.fn().mockReturnValue(false), get: vi.fn() } as any,
    {} as any,
    { listAIProviders: vi.fn().mockReturnValue(of([])) } as any,
    {} as any,
    new NonNullableFormBuilder(),
    { watchDeviceType: vi.fn().mockReturnValue(of(DeviceType.DESKTOP)) } as any
  );

  beforeEach(() => {
    couchService = {
      get: vi.fn((path: string) => of({ _id: path.replace('teams/', ''), name: path, type: 'team' }))
    };
    submissionsService = {
      createSubmission: vi.fn().mockReturnValue(of({ id: 'submission-1' }))
    };
    planetMessageService = {
      showAlert: vi.fn()
    };
    dialogsLoadingService = {
      start: vi.fn(),
      stop: vi.fn()
    };
    router = {
      url: '/teams/view/team-1',
      navigate: vi.fn()
    };
    route = {
      parent: null,
      snapshot: { url: [ 'surveys' ] }
    };
    stateService = { configuration: { name: 'Local Planet' } };
    component = createComponent();
  });

  it('fetches the current input team for each recording', () => {
    component.teamId = 'team-1';
    component.recordSurvey({ _id: 'survey-1', name: 'Survey 1' });

    component.teamId = 'team-2';
    component.recordSurvey({ _id: 'survey-2', name: 'Survey 2' });

    expect(couchService.get).toHaveBeenNthCalledWith(1, 'teams/team-1');
    expect(couchService.get).toHaveBeenNthCalledWith(2, 'teams/team-2');
    expect(submissionsService.createSubmission).toHaveBeenNthCalledWith(
      2,
      { _id: 'survey-2', name: 'Survey 2' },
      'survey',
      {},
      { _id: 'team-2', name: 'teams/team-2', type: 'team' }
    );
  });

  it('stops loading and shows an alert when recording fails', () => {
    submissionsService.createSubmission.mockReturnValue(throwError(() => new Error('failed')));

    component.recordSurvey({ _id: 'survey-1', name: 'Survey 1' });

    expect(dialogsLoadingService.start).toHaveBeenCalled();
    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith('There was a problem recording the survey.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate after the component is destroyed during recording', () => {
    const createSubmission$ = new Subject<any>();
    submissionsService.createSubmission.mockReturnValue(createSubmission$);

    component.recordSurvey({ _id: 'survey-1', name: 'Survey 1' });
    component.ngOnDestroy();
    createSubmission$.next({ id: 'submission-1' });

    expect(dialogsLoadingService.stop).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('excludes archived shareable surveys from the adopt view', () => {
    const archivedSurvey = {
      _id: 'survey-1',
      isArchived: true,
      teamId: 'team-1',
      teamIds: [ 'team-1' ],
      teamShareAllowed: true
    };
    const activeSurvey = {
      ...archivedSurvey,
      _id: 'survey-2',
      isArchived: false
    };
    component.teamId = 'team-2';
    component.allSurveys = [ archivedSurvey, activeSurvey ];
    component.currentFilter.viewMode = 'adopt';

    component.toggleSurveysView();

    expect(component.surveys.data).toEqual([ activeSurvey ]);
  });

  it('keeps archived shareable surveys visible in the team view', () => {
    const archivedSurvey = {
      _id: 'survey-1',
      isArchived: true,
      teamId: 'team-1',
      teamIds: [ 'team-1' ],
      teamShareAllowed: true
    };
    component.teamId = 'team-1';
    component.allSurveys = [ archivedSurvey ];
    component.currentFilter.viewMode = 'team';

    component.toggleSurveysView();

    expect(component.surveys.data).toEqual([ archivedSurvey ]);
  });

  it('does not fall back to an empty question tooltip for actions whose buttons stay enabled', () => {
    const survey = { _id: 'survey-1', questions: [], taken: 1 };

    expect(component.getActionTooltip(survey, 'send')).toBe('Send Survey');
    expect(component.getActionTooltip(survey, 'record')).toBe('Record Survey');
    expect(component.getActionTooltip(survey, 'public')).toBe('Generate a public survey link');
    expect(component.getActionTooltip(survey, 'submissions')).toBe('View Submissions');
  });

  it('keeps the archived and no submissions tooltips for surveys without questions', () => {
    expect(component.getActionTooltip({ _id: 'survey-1', questions: [], isArchived: true }, 'send'))
      .toBe('Survey is archived and cannot accept new actions');
    expect(component.getActionTooltip({ _id: 'survey-2', questions: [], taken: 0 }, 'submissions'))
      .toBe('There are no submissions to view');
  });
  it('does not claim the archive blocks actions the archive leaves enabled', () => {
    const survey = { _id: 'survey-1', isArchived: true, taken: 2 };

    expect(component.getActionTooltip(survey, 'select')).toBe('');
    expect(component.getActionTooltip(survey, 'submissions')).toBe('View Submissions');
    expect(component.getActionTooltip(survey, 'export')).toBe('Export Survey Submissions');
  });

  it('still explains the actions the archive does block', () => {
    const survey = { _id: 'survey-1', isArchived: true, taken: 2 };
    const archived = 'Survey is archived and cannot accept new actions';

    expect(component.getActionTooltip(survey, 'edit')).toBe(archived);
    expect(component.getActionTooltip(survey, 'send')).toBe(archived);
    expect(component.getActionTooltip(survey, 'record')).toBe(archived);
    expect(component.getActionTooltip(survey, 'public')).toBe(archived);
    expect(component.getActionTooltip(survey, 'revoke')).toBe(archived);
    expect(component.getActionTooltip(survey, 'archive')).toBe('Survey is already archived');
  });

  it('gives the missing data reason rather than the archive reason for archived surveys without submissions', () => {
    const survey = { _id: 'survey-1', isArchived: true, taken: 0 };

    expect(component.getActionTooltip(survey, 'submissions')).toBe('There are no submissions to view');
    expect(component.getActionTooltip(survey, 'export')).toBe('There is no data to export');
  });

  it('explains why team surveys cannot be sent or recorded from the manager route', () => {
    router.url = '/manager/surveys';
    component = createComponent();
    const teamSurvey = { _id: 'survey-1', teamId: 'team-1', taken: 2 };

    expect(component.getActionTooltip(teamSurvey, 'send')).toBe('Team surveys cannot be sent from here');
    expect(component.getActionTooltip(teamSurvey, 'record')).toBe('Team surveys cannot be recorded from here');
  });

  it('keeps the manager route action tooltips for surveys that belong to no team', () => {
    router.url = '/manager/surveys';
    component = createComponent();
    const survey = { _id: 'survey-1', taken: 2 };

    expect(component.getActionTooltip(survey, 'send')).toBe('Send Survey');
    expect(component.getActionTooltip(survey, 'record'))
      .toBe('Record survey information from a person who is not a member of Local Planet');
  });
  it('lists team surveys in the manager view so they stay administrable', () => {
    const teamSurvey = { _id: 'survey-1', teamId: 'team-1' };
    const adoptedSurvey = { _id: 'survey-2', teamId: 'team-1', sourceSurveyId: 'survey-1' };
    const managerSurvey = { _id: 'survey-3' };
    component.teamId = undefined;
    component.routeTeamId = undefined;
    component.allSurveys = [ teamSurvey, adoptedSurvey, managerSurvey ];
    component.currentFilter.viewMode = 'team';

    component.toggleSurveysView();

    expect(component.surveys.data).toEqual([ teamSurvey, managerSurvey ]);
  });
});
