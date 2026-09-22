import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, NEVER, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CoursesService } from '../courses/courses.service';
import { StateService } from '../shared/state.service';
import { CertificationsService } from '../manager-dashboard/certifications/certifications.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { CoursesViewDetailDialogComponent } from '../courses/view-courses/courses-view-detail.component';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent> | undefined;
  let shelfChange$: Subject<void>;
  let deviceType$: BehaviorSubject<DeviceType>;
  let userServiceMock: any;
  let couchServiceMock: any;
  let submissionsServiceMock: any;
  let coursesServiceMock: any;
  let stateServiceMock: any;
  let certificationsServiceMock: any;
  let deviceInfoServiceMock: any;
  let matDialogMock: any;

  const mockUser = {
    _id: 'user_123',
    name: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    roles: [ 'admin', 'learner' ],
    planetCode: 'planet_1'
  };

  const defaultShelf = {
    resourceIds: [ 'res_1' ],
    courseIds: [ 'course_1' ],
    meetupIds: [ 'meetup_1' ],
    myTeamIds: [ 'team_1' ]
  };

  beforeEach(() => {
    shelfChange$ = new Subject<void>();
    deviceType$ = new BehaviorSubject<DeviceType>(DeviceType.DESKTOP);
    userServiceMock = {
      get: vi.fn().mockReturnValue({ ...mockUser }),
      shelf: { ...defaultShelf },
      shelfChange$,
      profileBanner: new BehaviorSubject<boolean>(true),
      profileComplete$: new BehaviorSubject<boolean>(false),
      isProfileComplete: vi.fn()
    };
    couchServiceMock = {
      currentTime: vi.fn().mockReturnValue(of(1700000000000)),
      findAll: vi.fn().mockReturnValue(of([])),
      bulkGet: vi.fn().mockReturnValue(of([]))
    };
    submissionsServiceMock = { getSubmissions: vi.fn().mockReturnValue(of([])) };
    coursesServiceMock = {
      requestCourses: vi.fn(),
      coursesListener$: vi.fn().mockReturnValue(of([]))
    };
    stateServiceMock = { configuration: { name: 'Planet Earth', code: 'earth_code' } };
    certificationsServiceMock = {
      getCertifications: vi.fn().mockReturnValue(of([])),
      isCourseCompleted: CertificationsService.prototype.isCourseCompleted
    };
    deviceInfoServiceMock = { watchDeviceType: vi.fn().mockReturnValue(deviceType$.asObservable()) };
    matDialogMock = { open: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ DashboardComponent ],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: CouchService, useValue: couchServiceMock },
        { provide: SubmissionsService, useValue: submissionsServiceMock },
        { provide: CoursesService, useValue: coursesServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: CertificationsService, useValue: certificationsServiceMock },
        { provide: DeviceInfoService, useValue: deviceInfoServiceMock },
        { provide: MatDialog, useValue: matDialogMock }
      ]
    }).overrideComponent(DashboardComponent, { set: { template: '' } });
  });

  afterEach(() => {
    fixture?.destroy();
    vi.restoreAllMocks();
  });

  const createComponent = (userOverrides: any = {}) => {
    userServiceMock.get.mockReturnValue({ ...mockUser, ...userOverrides });
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    return fixture;
  };

  it('initializes user information and roles', () => {
    createComponent().detectChanges();

    expect(component.displayName).toBe('John Doe');
    expect(component.planetName).toBe('Planet Earth');
    expect(component.roles).toEqual([ 'learner', 'admin' ]);
  });

  it('uses the username when no name parts are available', () => {
    createComponent({ firstName: undefined, lastName: undefined }).detectChanges();

    expect(component.displayName).toBe('johndoe');
  });

  it('labels users with no roles as inactive', () => {
    createComponent({ roles: [] });

    expect(component.roles).toEqual([ 'Inactive' ]);
  });

  it('loads the login visit count', () => {
    couchServiceMock.findAll.mockImplementation((db: string) =>
      db === 'login_activities' ? of([ {}, {} ]) : of([])
    );

    createComponent().detectChanges();

    expect(component.visits).toBe(2);
  });

  it('recovers when loading login visits fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    couchServiceMock.findAll.mockImplementation((db: string) =>
      db === 'login_activities' ? throwError(new Error('CouchDB connection error')) : of([])
    );

    const testFixture = createComponent();
    component.visits = 3;
    testFixture.detectChanges();

    expect(component.visits).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith('Error fetching login activities');
  });

  it('loads and maps dashboard items from the shelf', () => {
    couchServiceMock.bulkGet.mockImplementation((db: string) => ({
      resources: of([ { _id: 'res_1', title: 'Resource 1' } ]),
      courses: of([ { _id: 'course_1', courseTitle: 'Course 1' } ]),
      meetups: of([ { _id: 'meetup_1', title: 'Meetup 1' } ]),
      teams: of([ { _id: 'team_1', name: 'Team 1' } ])
    })[db] || of([]));

    createComponent().detectChanges();

    expect(component.data.resources[0]).toMatchObject({ title: 'Resource 1', link: '/resources/view/res_1' });
    expect(component.data.courses[0]).toMatchObject({ title: 'Course 1', link: '/courses/view/course_1' });
    expect(component.data.meetups[0]).toMatchObject({ title: 'Meetup 1', link: '/meetups/view/meetup_1' });
    expect(component.data.myTeams[0]).toMatchObject({ title: 'Team 1', link: '/teams/view/team_1' });
    expect(component.isLoading).toBe(false);
  });

  it('clears stale dashboard data immediately for an empty shelf', () => {
    userServiceMock.shelf = { resourceIds: [], courseIds: [], meetupIds: [], myTeamIds: [] };
    couchServiceMock.bulkGet.mockReturnValue(NEVER);
    createComponent();
    component.data = { resources: [ {} ], courses: [ {} ], meetups: [ {} ], myTeams: [ {} ] };

    component.initDashboard();

    expect(component.data).toEqual({ resources: [], courses: [], meetups: [], myTeams: [] });
  });

  it('filters falsy shelf IDs before bulk loading data', () => {
    couchServiceMock.bulkGet.mockReturnValue(of([ { _id: 'res_1', title: 'Resource 1' } ]));
    createComponent();
    let result: any[];

    component.getData('resources', [ 'res_1', '', null ], { linkPrefix: '/resources/view/', addId: true })
      .subscribe(data => result = data);

    expect(couchServiceMock.bulkGet).toHaveBeenCalledWith('resources', [ 'res_1' ]);
    expect(result[0]).toMatchObject({ title: 'Resource 1', link: '/resources/view/res_1' });
  });

  it('returns an empty list when bulk loading fails', () => {
    couchServiceMock.bulkGet.mockReturnValue(throwError(new Error('Bulk get failed')));
    createComponent();
    let result: any[];

    component.getData('resources', [], { linkPrefix: '/resources/view/' }).subscribe(data => result = data);

    expect(result).toEqual([]);
  });

  it('returns an empty list when bulk loading returns a malformed payload', () => {
    couchServiceMock.bulkGet.mockReturnValue(of(null));
    createComponent();
    let result: any[];

    component.getData('resources', [], { linkPrefix: '/resources/view/' }).subscribe(data => result = data);

    expect(result).toEqual([]);
  });

  it('counts submissions using the expected survey and exam selectors', () => {
    submissionsServiceMock.getSubmissions.mockImplementation((query: any) =>
      query.selector.type === 'survey' ?
        of([ { parentId: 'p1' }, { parentId: 'p2' }, { parentId: 'p1' } ]) :
        of([ { _id: 'exam1' }, { _id: 'exam2' } ])
    );

    createComponent().detectChanges();

    expect(component.surveysCount).toBe(2);
    expect(component.examsCount).toBe(2);
    expect(submissionsServiceMock.getSubmissions).toHaveBeenCalledWith(expect.objectContaining({
      selector: { type: 'survey', status: 'pending', 'user.name': 'johndoe' }
    }));
    expect(submissionsServiceMock.getSubmissions).toHaveBeenCalledWith(expect.objectContaining({
      selector: { type: 'exam', status: 'requires grading', 'user.name': { $gt: null } }
    }));
  });

  it('sets canRemove only for team leaders', () => {
    couchServiceMock.findAll.mockReturnValue(of([
      { teamId: 'leader-team', isLeader: true },
      { teamId: 'member-team', isLeader: false }
    ]));
    couchServiceMock.bulkGet.mockReturnValue(of([
      { _id: 'leader-team', name: 'Leader Team' },
      { _id: 'member-team', name: 'Member Team' }
    ]));
    createComponent();
    let teams: any[];

    component.getTeamMembership().subscribe(result => teams = result);

    expect(teams).toEqual(expect.arrayContaining([
      expect.objectContaining({ _id: 'leader-team', canRemove: true }),
      expect.objectContaining({ _id: 'member-team', canRemove: false })
    ]));
  });

  it('filters archived teams from the dashboard', () => {
    couchServiceMock.bulkGet.mockImplementation((db: string, ids: string[]) =>
      db === 'teams' && ids.length > 0 ? of([
        { _id: 'team_active', name: 'Active Team', status: 'active' },
        { _id: 'team_archived', name: 'Archived Team', status: 'archived' }
      ]) : of([])
    );

    createComponent().detectChanges();

    expect(component.data.myTeams.map(team => team._id)).toEqual([ 'team_active' ]);
  });

  it('opens the course dialog with its expected configuration', () => {
    createComponent();

    component.openCourseView({ _id: 'course_999' });

    expect(matDialogMock.open).toHaveBeenCalledWith(CoursesViewDetailDialogComponent, {
      data: { courseId: 'course_999', returnState: { route: 'myDashboard' } },
      minWidth: '50vw',
      maxWidth: '80vw',
      maxHeight: '80vh',
      autoFocus: false
    });
  });

  it('updates and closes the profile completion banner', () => {
    createComponent().detectChanges();
    expect(component.showBanner).toBe(true);

    userServiceMock.profileComplete$.next(true);
    expect(component.showBanner).toBe(false);

    userServiceMock.profileComplete$.next(false);
    component.closeBanner();
    expect(component.showBanner).toBe(false);
    expect(userServiceMock.profileBanner.getValue()).toBe(false);
  });

  it('distinguishes small-mobile layout from mobile accordion mode', () => {
    createComponent();

    deviceType$.next(DeviceType.SMALL_MOBILE);
    expect(component.isMobile).toBe(true);
    expect(component.isAccordionMode).toBe(false);

    deviceType$.next(DeviceType.MOBILE);
    expect(component.isMobile).toBe(true);
    expect(component.isAccordionMode).toBe(true);
  });

  it('reloads dashboard data when the shelf changes', () => {
    createComponent().detectChanges();
    couchServiceMock.bulkGet.mockClear();

    shelfChange$.next();

    expect(couchServiceMock.bulkGet).toHaveBeenCalledWith('resources', [ 'res_1' ]);
  });

  it('stops responding to shelf changes after destruction', () => {
    const testFixture = createComponent();
    testFixture.detectChanges();
    couchServiceMock.bulkGet.mockClear();

    testFixture.destroy();
    fixture = undefined;
    shelfChange$.next();

    expect(couchServiceMock.bulkGet).not.toHaveBeenCalled();
  });

  describe('completed courses badges and overflow', () => {
    const createCompletedCourse = (id: string) => ({
      _id: id,
      doc: {
        courseTitle: `Course ${id}`,
        steps: [ {} ]
      },
      progress: [ { userId: mockUser._id, stepNum: 1, passed: true } ]
    });

    it('limits visible badges to 8 on desktop and 6 on tablet and mobile', () => {
      createComponent();
      const courses = Array.from({ length: 10 }, (_, i) => createCompletedCourse(`c_${i}`));
      component.setCompletedCourses(courses, []);

      deviceType$.next(DeviceType.DESKTOP);
      expect(component.isMobile).toBe(false);
      expect(component.maxVisibleBadges).toBe(8);
      expect(component.visibleBadges).toHaveLength(8);
      expect(component.remainingBadgesCount).toBe(2);

      deviceType$.next(DeviceType.TABLET);
      expect(component.maxVisibleBadges).toBe(6);
      expect(component.visibleBadges).toHaveLength(6);
      expect(component.hiddenBadges.map(course => course._id)).toEqual([ 'c_6', 'c_7', 'c_8', 'c_9' ]);

      deviceType$.next(DeviceType.MOBILE);
      expect(component.isMobile).toBe(true);
      expect(component.maxVisibleBadges).toBe(6);
      expect(component.visibleBadges).toHaveLength(6);
      expect(component.remainingBadgesCount).toBe(4);
    });

    it('returns 0 remaining badges when completed courses do not exceed max', () => {
      createComponent();
      const courses = [ createCompletedCourse('c_1'), createCompletedCourse('c_2') ];
      component.setCompletedCourses(courses, []);

      expect(component.remainingBadgesCount).toBe(0);
      expect(component.visibleBadges).toHaveLength(2);
    });

    it('names the overflow chip with its visible count', () => {
      createComponent();
      const courses = Array.from({ length: 10 }, (_, i) => createCompletedCourse(`c_${i}`));
      component.setCompletedCourses(courses, []);

      expect(component.moreBadgesLabel).toBe('Show 2 more completed courses');

      component.setCompletedCourses(courses.slice(0, 9), []);
      expect(component.moreBadgesLabel).toBe('Show 1 more completed course');
    });

    it('does not treat duplicate progress documents for one step as completion', () => {
      createComponent();
      component.setCompletedCourses([ {
        _id: 'two_steps',
        doc: { courseTitle: 'Two steps', steps: [ {}, {} ] },
        progress: [
          { userId: mockUser._id, stepNum: 1, passed: true },
          { userId: mockUser._id, stepNum: 1, passed: true }
        ]
      } ], []);

      expect(component.completedCourses).toHaveLength(0);
    });

    it('excludes a course with an unpassed step', () => {
      createComponent();
      component.setCompletedCourses([
        createCompletedCourse('completed'),
        {
          _id: 'incomplete',
          doc: { courseTitle: 'Incomplete', steps: [ {}, {} ] },
          progress: [
            { userId: mockUser._id, stepNum: 1, passed: true },
            { userId: mockUser._id, stepNum: 2, passed: false }
          ]
        }
      ], []);

      expect(component.completedCourses.map(course => course._id)).toEqual([ 'completed' ]);
    });

    it('excludes progress belonging to another user', () => {
      createComponent();
      component.setCompletedCourses([ {
        _id: 'another_users_course',
        doc: { courseTitle: 'Another user course', steps: [ {} ] },
        progress: [ { userId: 'another_user', stepNum: 1, passed: true } ]
      } ], []);

      expect(component.completedCourses).toHaveLength(0);
    });

    it('skips a course with no steps instead of throwing', () => {
      createComponent();

      expect(() => component.setCompletedCourses(
        [ { _id: 'no_steps', doc: { courseTitle: 'No steps' }, progress: [] } ], []
      )).not.toThrow();
      expect(component.completedCourses).toHaveLength(0);
    });

    it('sorts certified courses ahead of uncertified courses while preserving tie order', () => {
      createComponent();
      const courses = [
        createCompletedCourse('non_cert_1'),
        createCompletedCourse('cert_1'),
        createCompletedCourse('non_cert_2'),
        createCompletedCourse('cert_2')
      ];
      component.setCompletedCourses(courses, [ { courseIds: [ 'cert_1', 'cert_2' ] } ]);

      expect(component.completedCourses.map(c => c._id)).toEqual([
        'cert_1',
        'cert_2',
        'non_cert_1',
        'non_cert_2'
      ]);
    });
  });
});
