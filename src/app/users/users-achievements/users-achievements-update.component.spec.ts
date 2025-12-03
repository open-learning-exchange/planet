import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { UsersAchievementsUpdateComponent } from './users-achievements-update.component';

describe('UsersAchievementsUpdateComponent', () => {
  const fb = new UntypedFormBuilder();
  const user = {
    _id: 'user-id',
    name: 'User Name',
    firstName: 'User',
    middleName: '',
    lastName: 'Name'
  } as any;
  const configuration = { code: 'conf', parentCode: 'parent' } as any;

  const couchService = { post: jasmine.createSpy('post') } as any;
  const route = {} as any;
  const router = { navigate: jasmine.createSpy('navigate') } as any;
  const userService = { get: () => user, minBirthDate: new Date(), updateUser: jasmine.createSpy('updateUser') } as any;
  const planetMessageService = { showMessage: jasmine.createSpy('showMessage'), showAlert: jasmine.createSpy('showAlert') } as any;
  const dialogsFormService = { openDialogsForm: jasmine.createSpy('openDialogsForm') } as any;
  const validatorService = { notDateInFuture$: () => of(null) } as any;
  const stateService = { configuration } as any;
  const planetStepListService = { stepMoveClick$: of(null) } as any;

  it('initializes achievement-related form arrays with loaded data', () => {
    const achievementsResponse = {
      _id: 'user-id@conf',
      _rev: '1-abc',
      purpose: 'Purpose',
      goals: 'Goals',
      achievementsHeader: 'Header',
      achievements: [ { title: 'First', description: 'desc', date: '2023-01-01' } ],
      references: [ { name: 'Ref 1', email: 'ref@example.com' } ],
      links: [ { title: 'Link 1', url: 'https://example.com' } ],
      otherInfo: [ 'note' ],
      dateSortOrder: 'asc'
    } as any;
    const usersAchievementsService = { getAchievements: jasmine.createSpy('getAchievements').and.returnValue(of(achievementsResponse)) } as any;

    const component = new UsersAchievementsUpdateComponent(
      fb,
      couchService,
      route,
      router,
      userService,
      planetMessageService,
      usersAchievementsService,
      dialogsFormService,
      stateService,
      validatorService,
      planetStepListService
    );

    component.ngOnInit();

    expect(component.achievements.length).toBe(1);
    expect(component.references.length).toBe(1);
    expect(component.links.length).toBe(1);
    expect(component.editForm.controls.dateSortOrder.value).toBe('asc');
    expect(component.hasUnsavedChanges).toBeFalse();
  });
});
