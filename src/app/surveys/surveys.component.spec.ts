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
  let component: SurveysComponent;

  const createComponent = () => new SurveysComponent(
    couchService,
    submissionsService,
    planetMessageService,
    {} as any,
    router,
    route,
    { configuration: {} } as any,
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
});
