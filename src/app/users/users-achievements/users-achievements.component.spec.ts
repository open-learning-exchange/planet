import { ReplaySubject, Subject } from 'rxjs';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, Router } from '@angular/router';

import { UsersAchievementsComponent } from './users-achievements.component';
import { UsersAchievementsService } from './users-achievements.service';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CoursesService } from '../../courses/courses.service';
import { CertificationsService } from '../../manager-dashboard/certifications/certifications.service';
import { PdfService } from '../../shared/pdf.service';
import { PlanetLoadingSpinnerComponent } from '../../shared/planet-loading-spinner.component';

// The real spinner keeps nested SCSS in its inline styles, which JSDOM cannot parse
@Component({ selector: 'planet-loading-spinner', template: '' })
class TestLoadingSpinnerComponent {}

const loggedInUser = { _id: 'org.couchdb.user:carl', name: 'carl', planetCode: 'local' };

const achievementsDoc = (overrides: any = {}) => ({
  _id: 'org.couchdb.user:alice@local',
  purpose: 'purpose',
  goals: '',
  achievementsHeader: '',
  achievements: [],
  references: [],
  links: [],
  ...overrides
});

describe('UsersAchievementsComponent', () => {
  let component: UsersAchievementsComponent;
  let paramMap$: ReplaySubject<ParamMap>;
  let courses$: Subject<any[]>;
  let progress$: Subject<any[]>;
  let certificationRequests: Subject<any[]>[];
  let requests: Map<string, Subject<any>[]>;
  let couchService: { get: ReturnType<typeof vi.fn> };
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn> };
  let requestCourses: ReturnType<typeof vi.fn>;
  let requestData: ReturnType<typeof vi.fn>;
  let isCourseCompleted: ReturnType<typeof vi.fn>;
  let configuration: { code?: string, parentCode?: string };
  let configurationUpdates$: Subject<any>;
  let coursesResult: any[];
  let progressResult: any[];

  const createComponent = ({
    currentUser = loggedInUser,
    requiresAuth = true,
    initialConfiguration = { code: 'local', parentCode: 'parent' }
  }: any = {}) => {
    component?.ngOnDestroy();
    paramMap$ = new ReplaySubject<ParamMap>(1);
    courses$ = new Subject<any[]>();
    progress$ = new Subject<any[]>();
    certificationRequests = [];
    requests = new Map<string, Subject<any>[]>();
    configuration = { ...initialConfiguration };
    configurationUpdates$ = new Subject<any>();
    coursesResult = [];
    progressResult = [];
    couchService = {
      get: vi.fn((url: string) => {
        const pending = requests.get(url) || [];
        const newRequest = new Subject<any>();
        requests.set(url, [ ...pending, newRequest ]);
        return newRequest;
      })
    };
    planetMessageService = { showAlert: vi.fn() };
    const route: any = {
      snapshot: { data: requiresAuth === false ? { requiresAuth: false } : {} },
      paramMap: paramMap$
    };
    requestData = vi.fn();
    const stateService: any = {
      get configuration() {
        return configuration;
      },
      couchStateListener: () => configurationUpdates$,
      requestData
    };
    requestCourses = vi.fn(() => {
      courses$.next(coursesResult);
      progress$.next(progressResult);
    });
    const coursesService: any = {
      coursesListener$: () => courses$,
      progressListener$: () => progress$,
      requestCourses
    };
    isCourseCompleted = vi.fn(() => true);
    const certificationsService: any = {
      getCertifications: vi.fn(() => {
        const certificationRequest = new Subject<any[]>();
        certificationRequests.push(certificationRequest);
        return certificationRequest;
      }),
      isCourseCompleted
    };
    component = new UsersAchievementsComponent(
      couchService as any,
      { get: () => currentUser } as any,
      { navigate: vi.fn(), url: '' } as any,
      route,
      planetMessageService as any,
      new UsersAchievementsService(couchService as any),
      stateService,
      coursesService,
      certificationsService,
      { copy: vi.fn() } as any,
      { download: vi.fn() } as any,
      'en-US'
    );
    component.ngOnInit();
  };

  const navigate = (name: string | null, planet?: string) =>
    paramMap$.next(convertToParamMap(name === null ? {} : { name, planet }));

  const request = (url: string, index = 0) => {
    const pending = requests.get(url);
    if (!pending || !pending[index]) {
      throw new Error(`No request made for ${url}`);
    }
    return pending[index];
  };

  const userUrl = (name: string) => `_users/org.couchdb.user:${name}`;
  const achievementsUrl = (name: string, planet = 'local') => `achievements/org.couchdb.user:${name}@${planet}`;

  const completeCertifications = (certifications: any[], index = certificationRequests.length - 1) => {
    const certificationRequest = certificationRequests[index];
    if (!certificationRequest) {
      throw new Error(`No certification request made at index ${index}`);
    }
    certificationRequest.next(certifications);
    certificationRequest.complete();
  };

  beforeEach(() => {
    createComponent();
  });

  afterEach(() => {
    vi.useRealTimers();
    component.ngOnDestroy();
  });

  it('shows the user and achievements of the routed user', () => {
    navigate('alice', 'local');

    expect(component.userName).toBe('alice');
    expect(component.userPlanetCode).toBe('local');
    expect(component.user).toEqual({ name: 'alice', planetCode: 'local' });

    request(userUrl('alice')).next({ name: 'alice', firstName: 'Alice', birthplace: 'Nairobi' });
    request(achievementsUrl('alice')).next(achievementsDoc({ purpose: 'alice purpose' }));

    expect(component.user.firstName).toBe('Alice');
    expect(component.achievements.purpose).toBe('alice purpose');
  });

  it('cancels the requests of the previous user when the route changes', () => {
    navigate('alice', 'local');
    const aliceUser = request(userUrl('alice'));
    const aliceAchievements = request(achievementsUrl('alice'));
    navigate('bob', 'local');

    expect(aliceUser.observers.length).toBe(0);
    expect(aliceAchievements.observers.length).toBe(0);
  });

  it('cannot be overwritten by a late response of a previously routed user', () => {
    navigate('alice', 'local');
    const aliceUser = request(userUrl('alice'));
    const aliceAchievements = request(achievementsUrl('alice'));
    navigate('bob', 'local');
    request(userUrl('bob')).next({ name: 'bob', firstName: 'Bob' });
    request(achievementsUrl('bob')).next(achievementsDoc({ purpose: 'bob purpose' }));
    aliceUser.next({ name: 'alice', firstName: 'Alice' });
    aliceAchievements.next(achievementsDoc({ purpose: 'alice purpose' }));

    expect(component.user.firstName).toBe('Bob');
    expect(component.achievements.purpose).toBe('bob purpose');
  });

  it('only shows the last user of rapid route changes', () => {
    navigate('alice', 'local');
    navigate('bob', 'local');
    navigate('carol', 'local');
    request(userUrl('alice')).next({ name: 'alice', firstName: 'Alice' });
    request(achievementsUrl('alice')).next(achievementsDoc({ purpose: 'alice purpose' }));
    request(userUrl('bob')).next({ name: 'bob', firstName: 'Bob' });
    request(achievementsUrl('bob')).error({ status: 404 });
    request(userUrl('carol')).next({ name: 'carol', firstName: 'Carol' });
    request(achievementsUrl('carol')).next(achievementsDoc({ purpose: 'carol purpose' }));

    expect(component.userName).toBe('carol');
    expect(component.user.firstName).toBe('Carol');
    expect(component.achievements.purpose).toBe('carol purpose');
    expect(component.achievementNotFound).toBe(false);
  });

  it('shows achievements which respond before the user document', () => {
    navigate('alice', 'local');
    request(achievementsUrl('alice')).next(achievementsDoc({ purpose: 'alice purpose' }));

    expect(component.achievements.purpose).toBe('alice purpose');
    expect(component.user).toEqual({ name: 'alice', planetCode: 'local' });

    request(userUrl('alice')).next({ name: 'alice', firstName: 'Alice' });

    expect(component.user.firstName).toBe('Alice');
    expect(component.achievements.purpose).toBe('alice purpose');
  });

  it('does not keep the previous user when the new user request fails', () => {
    navigate('alice', 'local');
    request(userUrl('alice')).next({ name: 'alice', firstName: 'Alice', birthDate: 1, birthplace: 'Nairobi' });
    request(achievementsUrl('alice')).next(achievementsDoc());
    component.onAchievementClick({ description: 'details' }, 2);
    navigate('bob', 'local');
    request(userUrl('bob')).error({ status: 404 });

    expect(component.user).toEqual({ name: 'bob', planetCode: 'local' });
    expect(component.user.firstName).toBeUndefined();
    expect(component.user.birthDate).toBeUndefined();
    expect(component.user.birthplace).toBeUndefined();
    expect(component.achievements).toBeUndefined();
    expect(component.achievementNotFound).toBe(false);
    expect(component.openAchievementIndex).toBe(-1);
    expect(planetMessageService.showAlert).toHaveBeenCalled();

    request(achievementsUrl('bob')).next(achievementsDoc({ purpose: 'bob purpose' }));

    expect(component.achievements.purpose).toBe('bob purpose');
  });

  it('resets the achievements not found flag when the route changes', () => {
    navigate('alice', 'local');
    request(achievementsUrl('alice')).error({ status: 404 });

    expect(component.achievementNotFound).toBe(true);

    navigate('bob', 'local');

    expect(component.achievementNotFound).toBe(false);
  });

  it('resets own achievements when routing from the logged in user to another user', () => {
    navigate('carl', 'local');

    expect(component.ownAchievements).toBe(true);

    navigate('alice', 'local');

    expect(component.ownAchievements).toBe(false);
  });

  it('normalizes a missing planet code when loading the logged in user achievements', () => {
    navigate('carl');

    expect(component.userPlanetCode).toBe('local');
    expect(component.user).toEqual({ name: 'carl', planetCode: 'local' });
    expect(component.ownAchievements).toBe(true);
    request(achievementsUrl('carl')).error({ status: 404 });
    request('achievements/org.couchdb.user:carl').next(achievementsDoc({ purpose: 'carl purpose' }));

    expect(component.achievements.purpose).toBe('carl purpose');
    expect(component.achievementNotFound).toBe(false);
  });

  it('shows the achievements of the logged in user without a name parameter', () => {
    navigate(null);
    request(achievementsUrl('carl')).next(achievementsDoc({ purpose: 'carl purpose' }));

    expect(couchService.get).not.toHaveBeenCalledWith(userUrl('carl'));
    expect(component.user).toEqual(loggedInUser);
    expect(component.ownAchievements).toBe(true);
    expect(component.achievements.purpose).toBe('carl purpose');
  });

  it('does not request undefined achievements or claim ownership for an empty session', () => {
    createComponent({ currentUser: {} });
    navigate(null);

    expect(component.ownAchievements).toBe(false);
    expect(couchService.get).not.toHaveBeenCalled();
  });

  it('requests parent and child users from the correct databases', () => {
    navigate('alice', 'child');

    expect(couchService.get).toHaveBeenCalledWith('child_users/alice@child');

    navigate('alice', 'parent');

    expect(couchService.get).toHaveBeenCalledWith('parent_users/org.couchdb.user:alice');
  });

  it('treats a missing planet code as local when requesting a user', () => {
    navigate('alice');

    expect(component.userPlanetCode).toBe('local');
    expect(component.user).toEqual({ name: 'alice', planetCode: 'local' });
    expect(couchService.get).toHaveBeenCalledWith('_users/org.couchdb.user:alice');
    expect(couchService.get).toHaveBeenCalledWith(achievementsUrl('alice'));
    expect(couchService.get).not.toHaveBeenCalledWith('achievements/org.couchdb.user:alice@null');
  });

  it('waits for the local configuration before constructing route requests', () => {
    createComponent({ initialConfiguration: {} });
    navigate('alice', 'local');

    expect(requestData).toHaveBeenCalledWith('configurations', 'local');
    expect(couchService.get).not.toHaveBeenCalled();

    configuration = { code: 'local', parentCode: 'parent' };
    configurationUpdates$.next({ db: 'configurations' });

    expect(couchService.get).toHaveBeenCalledWith('_users/org.couchdb.user:alice');
    expect(couchService.get).toHaveBeenCalledWith(achievementsUrl('alice'));
  });

  it('uses an already loaded local configuration without requesting it again', () => {
    navigate('alice', 'local');

    expect(requestData).not.toHaveBeenCalled();
    expect(couchService.get).toHaveBeenCalledWith('_users/org.couchdb.user:alice');
    expect(couchService.get).toHaveBeenCalledWith(achievementsUrl('alice'));
  });

  describe('userRelationship', () => {
    it('distinguishes local, parent, and child planet codes', () => {
      expect(component.userRelationship('local')).toBe('local');
      expect(component.userRelationship(null)).toBe('local');
      expect(component.userRelationship(undefined)).toBe('local');
      expect(component.userRelationship('parent')).toBe('parent');
      expect(component.userRelationship('child')).toBe('child');
    });

    it('returns local for a missing planet code when the parent code is also missing', () => {
      configuration = { code: 'local', parentCode: undefined };

      expect(component.userRelationship(undefined)).toBe('local');
    });
  });

  it('shows an alert when the achievements request fails without a 404', () => {
    navigate('alice', 'local');
    request(achievementsUrl('alice')).error({ status: 500 });

    expect(component.achievementNotFound).toBe(false);
    expect(planetMessageService.showAlert).toHaveBeenCalled();
  });

  it('route-scopes authenticated loading, courses, and certifications', () => {
    vi.useFakeTimers();
    navigate('alice', 'local');
    request(userUrl('alice')).next({ _id: 'org.couchdb.user:alice', name: 'alice', planetCode: 'local' });
    completeCertifications([ { name: 'Alice certification', courseIds: [] } ]);
    vi.advanceTimersByTime(600);

    expect(component.certifications).toEqual([ { name: 'Alice certification', courseIds: [] } ]);
    expect(component.isLoading).toBe(false);

    courses$.next(coursesResult);

    navigate('bob', 'local');

    expect(component.certifications).toEqual([]);
    expect(component.isLoading).toBe(true);
    // The new route requests its courses and certifications immediately instead of waiting for its user document
    expect(requestCourses).toHaveBeenCalledTimes(2);
    expect(certificationRequests).toHaveLength(2);

    vi.advanceTimersByTime(600);

    expect(component.certifications).toEqual([]);
    expect(component.isLoading).toBe(true);

    request(userUrl('bob')).next({ _id: 'org.couchdb.user:bob', name: 'bob', planetCode: 'local' });

    completeCertifications([ { name: 'Bob certification', courseIds: [] } ]);
    vi.advanceTimersByTime(600);

    expect(component.certifications).toEqual([ { name: 'Bob certification', courseIds: [] } ]);
    expect(component.isLoading).toBe(false);
  });

  it('calculates certifications with the resolved route user', () => {
    vi.useFakeTimers();
    coursesResult = [ { _id: 'course', doc: { steps: [] } } ];
    const resolvedUser = { _id: 'org.couchdb.user:alice', name: 'alice', planetCode: 'local' };
    navigate('alice', 'local');
    request(userUrl('alice')).next(resolvedUser);
    completeCertifications([ { name: 'certification', courseIds: [ 'course' ] } ]);
    vi.advanceTimersByTime(600);

    expect(isCourseCompleted).toHaveBeenCalledWith(expect.objectContaining({ _id: 'course' }), resolvedUser);
  });

  it('completes authenticated loading when the routed user lookup fails', () => {
    vi.useFakeTimers();
    navigate('alice', 'local');
    request(userUrl('alice')).error({ status: 404 });

    expect(requestCourses).toHaveBeenCalledTimes(1);

    completeCertifications([ { name: 'certification', courseIds: [] } ]);
    vi.advanceTimersByTime(600);

    expect(component.certifications).toEqual([]);
    expect(component.isLoading).toBe(false);
  });

  it('keeps handling route changes when the certifications request fails', () => {
    navigate('alice', 'local');
    request(userUrl('alice')).next({ _id: 'org.couchdb.user:alice', name: 'alice', planetCode: 'local' });
    certificationRequests[0].error({ status: 403 });

    expect(component.certifications).toEqual([]);
    expect(component.isLoading).toBe(false);

    navigate('bob', 'local');
    request(achievementsUrl('bob')).next(achievementsDoc({ purpose: 'bob purpose' }));

    expect(component.achievements.purpose).toBe('bob purpose');
  });

  it('restores loading on every public route change', () => {
    createComponent({ currentUser: {}, requiresAuth: false });
    navigate('alice', 'local');

    expect(component.publicView).toBe(true);
    expect(component.isLoading).toBe(true);

    request(achievementsUrl('alice')).next(achievementsDoc());

    expect(component.isLoading).toBe(false);

    navigate('bob', 'local');

    expect(component.isLoading).toBe(true);

    request(achievementsUrl('bob')).next(achievementsDoc());

    expect(component.isLoading).toBe(false);
  });
});

describe('UsersAchievementsComponent template loading', () => {
  let fixture: ComponentFixture<UsersAchievementsComponent>;
  let paramMap$: ReplaySubject<ParamMap>;
  let achievements$: Subject<any>;

  beforeEach(() => {
    paramMap$ = new ReplaySubject<ParamMap>(1);
    achievements$ = new Subject<any>();
    TestBed.configureTestingModule({
      imports: [ UsersAchievementsComponent ],
      providers: [
        { provide: CouchService, useValue: { get: vi.fn(() => new Subject<any>()) } },
        { provide: UserService, useValue: { get: () => ({}), isBetaEnabled: () => false } },
        {
          provide: StateService,
          useValue: {
            configuration: { code: 'local', parentCode: 'parent' },
            couchStateListener: () => new Subject<any>(),
            requestData: () => undefined
          }
        },
        {
          provide: UsersAchievementsService,
          useValue: { getAchievements: vi.fn(() => achievements$), isEmpty: vi.fn(() => false) }
        },
        {
          provide: CoursesService,
          useValue: {
            coursesListener$: vi.fn(() => new Subject<any[]>()),
            progressListener$: vi.fn(() => new Subject<any[]>()),
            requestCourses: vi.fn()
          }
        },
        {
          provide: CertificationsService,
          useValue: { getCertifications: vi.fn(() => new Subject<any[]>()), isCourseCompleted: vi.fn() }
        },
        { provide: PlanetMessageService, useValue: { showAlert: vi.fn() } },
        { provide: PdfService, useValue: { download: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn(), url: '' } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { requiresAuth: false } }, paramMap: paramMap$ } }
      ]
    });
    TestBed.overrideComponent(UsersAchievementsComponent, {
      remove: { imports: [ PlanetLoadingSpinnerComponent ] },
      add: { imports: [ TestLoadingSpinnerComponent ] }
    });
    fixture = TestBed.createComponent(UsersAchievementsComponent);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('removes the visible spinner when a public achievement request completes', () => {
    paramMap$.next(convertToParamMap({ name: 'alice', planet: 'local' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('planet-loading-spinner')).not.toBeNull();

    achievements$.error({ status: 404 });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('planet-loading-spinner')).toBeNull();
  });
});
