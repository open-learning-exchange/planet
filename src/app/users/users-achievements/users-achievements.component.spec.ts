import { Subject } from 'rxjs';
import { convertToParamMap, ParamMap } from '@angular/router';

import { UsersAchievementsComponent } from './users-achievements.component';
import { UsersAchievementsService } from './users-achievements.service';

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
  let paramMap$: Subject<ParamMap>;
  let courses$: Subject<any[]>;
  let progress$: Subject<any[]>;
  let certifications$: Subject<any[]>;
  let requests: Map<string, Subject<any>[]>;
  let couchService: { get: ReturnType<typeof vi.fn> };
  let planetMessageService: { showAlert: ReturnType<typeof vi.fn> };

  const createComponent = ({ currentUser = loggedInUser, requiresAuth = true }: any = {}) => {
    paramMap$ = new Subject<ParamMap>();
    courses$ = new Subject<any[]>();
    progress$ = new Subject<any[]>();
    certifications$ = new Subject<any[]>();
    requests = new Map<string, Subject<any>[]>();
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
    const stateService: any = { configuration: { code: 'local', parentCode: 'parent' } };
    const coursesService: any = {
      coursesListener$: () => courses$,
      progressListener$: () => progress$,
      requestCourses: vi.fn()
    };
    const certificationsService: any = {
      getCertifications: () => certifications$,
      isCourseCompleted: vi.fn(() => true)
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

  beforeEach(() => createComponent());

  afterEach(() => {
    vi.useRealTimers();
    component.ngOnDestroy();
  });

  it('shows the user and achievements of the routed user', () => {
    navigate('alice', 'local');
    request(userUrl('alice')).next({ name: 'alice', firstName: 'Alice', birthplace: 'Nairobi' });
    request(achievementsUrl('alice')).next(achievementsDoc({ purpose: 'alice purpose' }));

    expect(component.userName).toBe('alice');
    expect(component.userPlanetCode).toBe('local');
    expect(component.user.firstName).toBe('Alice');
    expect(component.achievements.purpose).toBe('alice purpose');
  });

  it('sets the name and planet code of the routed user synchronously', () => {
    navigate('alice@local', 'local');

    expect(component.userName).toBe('alice');
    expect(component.userPlanetCode).toBe('local');
    expect(component.user).toEqual({ name: 'alice', planetCode: 'local' });
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
    component.toggleOpenAchievementIndex(2);
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
  });

  it('still shows the achievements when the user request fails', () => {
    navigate('alice', 'local');
    request(userUrl('alice')).error({ status: 500 });
    request(achievementsUrl('alice')).next(achievementsDoc({ purpose: 'alice purpose' }));

    expect(component.achievements.purpose).toBe('alice purpose');
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

  it('falls back to the achievements of the logged in user without a planet code', () => {
    navigate('carl', 'local');
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

  it('requests the user of another planet from the child users database', () => {
    navigate('alice', 'child');

    expect(couchService.get).toHaveBeenCalledWith('child_users/alice@child');
  });

  it('shows an alert when the achievements request fails without a 404', () => {
    navigate('alice', 'local');
    request(achievementsUrl('alice')).error({ status: 500 });

    expect(component.achievementNotFound).toBe(false);
    expect(planetMessageService.showAlert).toHaveBeenCalled();
  });

  it('sets not found for empty achievements', () => {
    navigate('alice', 'local');
    request(achievementsUrl('alice')).next(achievementsDoc({ purpose: '' }));

    expect(component.achievementNotFound).toBe(true);
    expect(component.achievements).toBeUndefined();
  });

  it('keeps loading until the certifications of the logged in user are calculated', () => {
    vi.useFakeTimers();
    navigate('alice', 'local');
    request(achievementsUrl('alice')).next(achievementsDoc());

    expect(component.isLoading).toBe(true);

    courses$.next([]);
    progress$.next([]);
    certifications$.next([ { name: 'certification', courseIds: [] } ]);
    vi.advanceTimersByTime(600);

    expect(component.certifications).toEqual([ { name: 'certification', courseIds: [] } ]);
    expect(component.isLoading).toBe(false);
  });

  it('stops loading in the public view once the achievements respond', () => {
    createComponent({ currentUser: {}, requiresAuth: false });
    navigate('alice', 'local');

    expect(component.publicView).toBe(true);
    expect(component.isLoading).toBe(true);

    request(achievementsUrl('alice')).next(achievementsDoc());

    expect(component.isLoading).toBe(false);
  });
});
