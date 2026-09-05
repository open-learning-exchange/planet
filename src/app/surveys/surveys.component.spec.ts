import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
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
  let dialogsFormService: any;
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
    dialogsFormService,
    { listAIProviders: vi.fn().mockReturnValue(of([])) } as any,
    {} as any,
    new FormBuilder().nonNullable,
    { watchDeviceType: vi.fn().mockReturnValue(of(DeviceType.DESKTOP)) } as any
  );

  beforeEach(() => {
    couchService = {
      get: vi.fn((path: string) => of({ _id: path.replace('teams/', ''), name: path, type: 'team' })),
      post: vi.fn().mockReturnValue(of({})),
      put: vi.fn().mockReturnValue(of({}))
    };
    submissionsService = {};
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
    dialogsFormService = {
      openDialogsForm: vi.fn(),
      closeDialogsForm: vi.fn()
    };
    component = createComponent();
  });

  it('sends the current input team along to each recording', () => {
    component.teamId = 'team-1';
    component.recordSurvey({ _id: 'survey-1', name: 'Survey 1' });

    component.teamId = 'team-2';
    component.recordSurvey({ _id: 'survey-2', name: 'Survey 2' });

    expect(router.navigate).toHaveBeenNthCalledWith(
      2,
      [ 'surveys/dispense', expect.objectContaining({ surveyId: 'survey-2', surveyTeamId: 'team-2', mode: 'take' }) ],
      expect.anything()
    );
  });

  it('leaves the submission to be created by the first saved answer', () => {
    component.recordSurvey({ _id: 'survey-1', name: 'Survey 1' });

    expect(couchService.post).not.toHaveBeenCalled();
    expect(couchService.put).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      [ 'dispense', expect.objectContaining({ questionNum: 1, surveyId: 'survey-1', mode: 'take' }) ],
      expect.anything()
    );
    expect(router.navigate.mock.calls[0][0][1].surveyTeamId).toBeUndefined();
  });

  it('keeps the search input synchronized with the table filter', () => {
    component.applyFilter('survey title');

    expect(component.searchValue).toBe('survey title');
    expect(component.surveys.filter).toBe('survey title');
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

  it('explains question-dependent actions when a survey has no questions', () => {
    const survey = { _id: 'survey-1', questions: [], taken: 1 };

    for (const action of [ 'send', 'record', 'public', 'submissions' ] as const) {
      expect(component.getActionTooltip(survey, action)).toBe('Survey has no questions');
    }
  });

  it('does not claim missing questions block the actions that stay enabled without them', () => {
    const survey = { _id: 'survey-1', questions: [], taken: 1 };

    expect(component.getActionTooltip(survey, 'select')).toBe('');
    expect(component.getActionTooltip(survey, 'export')).toBe('Export Survey Submissions');
    expect(component.getActionTooltip(survey, 'edit')).toBe('Edit Survey');
  });

  it('keeps the archived and no submissions tooltips for surveys without questions', () => {
    expect(component.getActionTooltip({ _id: 'survey-1', questions: [], isArchived: true }, 'send'))
      .toBe('Survey is archived and cannot accept new actions');
    expect(component.getActionTooltip({ _id: 'survey-2', questions: [], taken: 0 }, 'submissions'))
      .toBe('There are no submissions to view');
  });

  it('does not claim the archive blocks actions the archive leaves enabled', () => {
    const survey = { _id: 'survey-1', questions: [ {} ], isArchived: true, taken: 2 };

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
    const survey = { _id: 'survey-1', questions: [ {} ], taken: 2 };

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
  it('opens the export dialog for a survey whose questions property is missing', () => {
    component.exportPdf({ _id: 'survey-1', taken: 1 });

    expect(dialogsFormService.openDialogsForm).toHaveBeenCalled();
    const fields = dialogsFormService.openDialogsForm.mock.calls[0][1];
    expect(fields.find(field => field.name === 'includeCharts').disabled).toBe(true);
  });
});
