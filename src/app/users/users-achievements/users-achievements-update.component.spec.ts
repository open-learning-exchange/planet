import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ReactiveFormsModule, UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CouchService } from '../../shared/couchdb.service';
import { DialogsFormService } from '../../shared/dialogs/dialogs-form.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { PlanetStepListService } from '../../shared/forms/planet-step-list.component';
import { StateService } from '../../shared/state.service';
import { UserService } from '../../shared/user.service';
import { UsersAchievementsService } from './users-achievements.service';
import { UsersAchievementsUpdateComponent } from './users-achievements-update.component';
import { ValidatorService } from '../../validators/validator.service';

class MockCouchService {
  post = jasmine.createSpy('post').and.returnValue(of({ ok: true }));
}

class MockUserService {
  minBirthDate = new Date(0);
  get = jasmine.createSpy('get').and.returnValue({
    _id: 'user-1',
    name: 'mock-user',
    firstName: 'Mock',
    middleName: '',
    lastName: 'User',
    birthDate: '',
    birthplace: ''
  });
  updateUser = jasmine.createSpy('updateUser').and.returnValue(of({}));
}

class MockUsersAchievementsService {
  getAchievements = jasmine.createSpy('getAchievements').and.returnValue(of({}));
}

class MockDialogsFormService {
  openDialogsForm = jasmine.createSpy('openDialogsForm');
}

class MockPlanetMessageService {
  showMessage = jasmine.createSpy('showMessage');
  showAlert = jasmine.createSpy('showAlert');
}

class MockStateService {
  configuration = { code: 'conf', parentCode: 'parent' };
}

class MockValidatorService {
  notDateInFuture$ = () => of(null);
}

class MockPlanetStepListService {
  stepMoveClick$ = of();
}

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

class MockActivatedRoute {}

function createComponent() {
  const fb = TestBed.inject(UntypedFormBuilder);
  const couchService = TestBed.inject(CouchService);
  const route = TestBed.inject(ActivatedRoute);
  const router = TestBed.inject(Router);
  const userService = TestBed.inject(UserService);
  const planetMessageService = TestBed.inject(PlanetMessageService);
  const usersAchievementsService = TestBed.inject(UsersAchievementsService);
  const dialogsFormService = TestBed.inject(DialogsFormService);
  const stateService = TestBed.inject(StateService);
  const validatorService = TestBed.inject(ValidatorService);
  const planetStepListService = TestBed.inject(PlanetStepListService);

  return new UsersAchievementsUpdateComponent(
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
}


describe('UsersAchievementsUpdateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ ReactiveFormsModule ],
      providers: [
        UntypedFormBuilder,
        { provide: CouchService, useClass: MockCouchService },
        { provide: UserService, useClass: MockUserService },
        { provide: UsersAchievementsService, useClass: MockUsersAchievementsService },
        { provide: DialogsFormService, useClass: MockDialogsFormService },
        { provide: PlanetMessageService, useClass: MockPlanetMessageService },
        { provide: StateService, useClass: MockStateService },
        { provide: ValidatorService, useClass: MockValidatorService },
        { provide: PlanetStepListService, useClass: MockPlanetStepListService },
        { provide: ActivatedRoute, useClass: MockActivatedRoute },
        { provide: Router, useClass: MockRouter }
      ]
    });
  });

  it('initializes missing arrays and preserves revision when applying achievements', () => {
    const component = createComponent();
    const doc = { _id: component.docInfo._id, _rev: '1-abc', goals: 'goal' } as any;

    (component as any).applyAchievementsToForm(doc);

    expect(component.achievements.length).toBe(0);
    expect(component.references.length).toBe(0);
    expect(component.links.length).toBe(0);
    expect((component as any).docInfo._rev).toBe('1-abc');
  });

  it('updates document id and revision when legacy id is loaded', () => {
    const component = createComponent();
    const doc = { _id: (component as any).user._id, _rev: '2-def', references: [ { name: 'Ref' } ] } as any;

    (component as any).applyAchievementsToForm(doc);

    expect((component as any).docInfo._id).toBe((component as any).user._id);
    expect((component as any).docInfo._rev).toBe('2-def');
    expect(component.references.length).toBe(1);
  });

  it('normalizes dialog submissions before adding them to form arrays', () => {
    const component = createComponent();
    const group = (component as any).fb.group({
      title: 'Title',
      description: 'Desc',
      link: ' http://example.com ',
      date: new Date('2020-01-01T00:00:00Z')
    });

    component.updateFormArray(component.achievements, group);

    const saved = component.achievements.at(0).value;
    expect(saved.link).toBe('http://example.com');
    expect(saved.date).toBe('2020-01-01T00:00:00.000Z');
  });

  it('resets unsaved change tracking after navigation decisions and saves', fakeAsync(() => {
    const component = createComponent();
    (component as any).applyAchievementsToForm({});

    component.editForm.controls.purpose.setValue('new purpose');
    tick(250);
    expect(component.hasUnsavedChanges).toBeTrue();

    component.onLeaveConfirmed();
    expect(component.hasUnsavedChanges).toBeFalse();

    component.editForm.controls.goals.setValue('new goal');
    tick(250);
    expect(component.hasUnsavedChanges).toBeTrue();

    component.updateAchievements((component as any).docInfo, component.editForm.value, component.profileForm.value);
    tick();
    expect(component.hasUnsavedChanges).toBeFalse();
  }));
});
