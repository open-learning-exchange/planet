import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DashboardComponent } from './dashboard.component';
import { UserService } from '../shared/user.service';
import { CouchService } from '../shared/couchdb.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { CoursesService } from '../courses/courses.service';
import { StateService } from '../shared/state.service';
import { CertificationsService } from '../manager-dashboard/certifications/certifications.service';
import { DeviceInfoService, DeviceType } from '../shared/device-info.service';
import { TeamsService } from '../teams/teams.service';
import { CoursesViewDetailDialogComponent } from '../courses/view-courses/courses-view-detail.component';

describe('DashboardComponent - Rigorous Edge Cases & Stress Tests', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  const mockUser = {
    _id: 'user_123',
    name: 'johndoe',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['admin', 'learner'],
    planetCode: 'planet_1'
  };

  const userServiceMock = {
    get: vi.fn().mockReturnValue(mockUser),
    shelf: {
      resourceIds: ['res_1'],
      courseIds: ['course_1'],
      meetupIds: ['meetup_1'],
      myTeamIds: ['team_1']
    },
    userChange$: new Subject<any>(),
    shelfChange$: new Subject<void>(),
    profileBanner: new BehaviorSubject<boolean>(true),
    profileComplete$: new BehaviorSubject<boolean>(false),
    isProfileComplete: vi.fn(),
    doesUserHaveRole: vi.fn().mockReturnValue(true)
  };

  const couchServiceMock = {
    currentTime: vi.fn().mockReturnValue(of(1700000000000)),
    findAll: vi.fn().mockReturnValue(of([])),
    bulkGet: vi.fn().mockReturnValue(of([]))
  };

  const submissionsServiceMock = {
    getSubmissions: vi.fn().mockReturnValue(of([]))
  };

  const coursesServiceMock = {
    requestCourses: vi.fn(),
    coursesListener$: vi.fn().mockReturnValue(of([]))
  };

  const stateServiceMock = {
    configuration: { name: 'Planet Earth', code: 'earth_code' }
  };

  const certificationsServiceMock = {
    getCertifications: vi.fn().mockReturnValue(of([]))
  };

  const deviceTypeSubject = new BehaviorSubject<DeviceType>(DeviceType.DESKTOP);
  const deviceInfoServiceMock = {
    watchDeviceType: vi.fn().mockReturnValue(deviceTypeSubject.asObservable())
  };

  const teamsServiceMock = {
    toggleTeamMembership: vi.fn().mockReturnValue(of({}))
  };

  const matDialogMock = {
    open: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    userServiceMock.get.mockReturnValue({ ...mockUser });
    couchServiceMock.currentTime.mockReturnValue(of(1700000000000));
    couchServiceMock.findAll.mockReturnValue(of([]));
    couchServiceMock.bulkGet.mockReturnValue(of([]));
    submissionsServiceMock.getSubmissions.mockReturnValue(of([]));
    coursesServiceMock.coursesListener$.mockReturnValue(of([]));
    certificationsServiceMock.getCertifications.mockReturnValue(of([]));
    userServiceMock.doesUserHaveRole.mockReturnValue(true);

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: CouchService, useValue: couchServiceMock },
        { provide: SubmissionsService, useValue: submissionsServiceMock },
        { provide: CoursesService, useValue: coursesServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: CertificationsService, useValue: certificationsServiceMock },
        { provide: DeviceInfoService, useValue: deviceInfoServiceMock },
        { provide: TeamsService, useValue: teamsServiceMock },
        { provide: MatDialog, useValue: matDialogMock },
        provideRouter([]),
        provideHttpClient(withInterceptorsFromDi())
      ]
    });

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  describe('Standard Functional Suite', () => {
    it('should create the DashboardComponent', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize user information and roles on init', () => {
      fixture.detectChanges();
      expect(component.displayName).toBe('John Doe');
      expect(component.planetName).toBe('Planet Earth');
      expect(component.roles).toEqual(['learner', 'admin']);
    });

    it('should fallback to username when firstName is undefined', () => {
      userServiceMock.get.mockReturnValue({ ...mockUser, firstName: undefined });
      fixture = TestBed.createComponent(DashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      expect(component.displayName).toBe('johndoe');
    });

    it('should load login activities and update visit count', () => {
      couchServiceMock.findAll.mockImplementation((db: string) => {
        if (db === 'login_activities') {
          return of([{ user: 'johndoe' }, { user: 'johndoe' }]);
        }
        return of([]);
      });

      fixture.detectChanges();
      expect(component.visits).toBe(2);
    });

    it('should handle error when fetching login activities smoothly', () => {
      couchServiceMock.findAll.mockImplementation((db: string) => {
        if (db === 'login_activities') {
          return throwError(() => new Error('CouchDB connection error'));
        }
        return of([]);
      });

      fixture.detectChanges();
      expect(component.visits).toBe(0);
    });

    it('should load dashboard items from shelf via initDashboard()', () => {
      couchServiceMock.bulkGet.mockImplementation((db: string, ids: string[]) => {
        if (db === 'resources') {
          return of([{ _id: 'res_1', title: 'Resource 1' }]);
        }
        if (db === 'courses') {
          return of([{ _id: 'course_1', courseTitle: 'Course 1' }]);
        }
        if (db === 'meetups') {
          return of([{ _id: 'meetup_1', title: 'Meetup 1' }]);
        }
        if (db === 'teams') {
          return of([{ _id: 'team_1', name: 'Team 1' }]);
        }
        return of([]);
      });

      fixture.detectChanges();
      expect(component.data.resources.length).toBe(1);
      expect(component.data.courses.length).toBe(1);
      expect(component.data.meetups.length).toBe(1);
      expect(component.data.myTeams.length).toBe(1);
      expect(component.isLoading).toBe(false);
    });

    it('should detect empty shelf correctly', () => {
      const emptyShelf = { courseIds: [], meetupIds: [], myTeamIds: [], resourceIds: [] };
      expect(component.isEmptyShelf(emptyShelf)).toBe(true);

      const nonEmptyShelf = { courseIds: ['c1'], meetupIds: [], myTeamIds: [], resourceIds: [] };
      expect(component.isEmptyShelf(nonEmptyShelf)).toBe(false);
    });

    it('should compute profileImg correctly when attachments exist or fallback to default asset', () => {
      expect(component.profileImg).toBe('assets/image.png');

      const userWithPic = { ...mockUser, _attachments: { 'avatar.png': {} } };
      component.user = userWithPic;
      expect(component.profileImg).toContain('_users/org.couchdb.user:johndoe/avatar.png');
    });

    it('should update surveysCount and examsCount correctly', () => {
      submissionsServiceMock.getSubmissions.mockImplementation((query: any) => {
        if (query.selector.type === 'survey') {
          return of([{ parentId: 'p1' }, { parentId: 'p2' }, { parentId: 'p1' }]);
        }
        if (query.selector.type === 'exam') {
          return of([{ _id: 'exam1' }, { _id: 'exam2' }]);
        }
        return of([]);
      });

      fixture.detectChanges();
      expect(component.surveysCount).toBe(2);
      expect(component.examsCount).toBe(2);
    });

    it('should calculate badge courses and groups correctly in setBadgesCourses()', () => {
      const courses = [
        {
          _id: 'course_101',
          doc: { courseTitle: 'English 1', foundation: 'literacy', steps: [{ _id: 's1' }] },
          progress: [{ passed: true }]
        },
        {
          _id: 'course_102',
          doc: { courseTitle: 'Incomplete Course', foundation: 'math', steps: [{ _id: 's1' }] },
          progress: [{ passed: false }]
        }
      ];

      const certifications = [
        { _id: 'cert_1', courseIds: ['course_101'] }
      ];

      component.setBadgesCourses(courses, certifications);
      expect(component.badgesCourses['literacy'].length).toBe(1);
      expect(component.badgesCourses['literacy'][0].inCertification).toBe(true);
      expect(component.badgeGroups).toContain('literacy');
      expect(component.badgeGroups).not.toContain('math');
    });

    it('should handle team removal locally in teamRemoved()', () => {
      component.data.myTeams = [{ _id: 't1', name: 'Team A' }, { _id: 't2', name: 'Team B' }];
      component.teamRemoved({ _id: 't1' });
      expect(component.data.myTeams.length).toBe(1);
      expect(component.data.myTeams[0]._id).toBe('t2');
    });

    it('should open course view dialog via openCourseView()', () => {
      const courseMock = { _id: 'course_999' };
      component.openCourseView(courseMock);

      expect(matDialogMock.open).toHaveBeenCalledWith(
        CoursesViewDetailDialogComponent,
        expect.objectContaining({
          data: { courseId: 'course_999', returnState: { route: 'myDashboard' } }
        })
      );
    });

    it('should manage profile completeness banner state and close banner', () => {
      fixture.detectChanges();
      expect(component.showBanner).toBe(true);

      component.closeBanner();
      expect(component.showBanner).toBe(false);
      expect(userServiceMock.profileBanner.getValue()).toBe(false);
    });

    it('should update mobile layout properties when deviceType changes', () => {
      fixture.detectChanges();
      expect(component.isMobile).toBe(false);

      deviceTypeSubject.next(DeviceType.MOBILE);
      expect(component.isMobile).toBe(true);
      expect(component.isAccordionMode).toBe(true);
    });
  });

  describe('Rigorous Stress & Edge Case Scenarios', () => {
    it('should gracefully handle empty user roles without throwing', () => {
      userServiceMock.get.mockReturnValue({ ...mockUser, roles: [] });
      fixture = TestBed.createComponent(DashboardComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      expect(component.roles).toEqual(['Inactive']);
    });

    it('should handle bulkGet returning empty/falsy responses cleanly', () => {
      couchServiceMock.bulkGet.mockReturnValue(of([]));
      fixture.detectChanges();
      expect(component.data.resources).toEqual([]);
      expect(component.data.courses).toEqual([]);
      expect(component.data.meetups).toEqual([]);
      expect(component.isLoading).toBe(false);
    });

    it('should handle bulkGet error gracefully without crashing initDashboard', () => {
      couchServiceMock.bulkGet.mockReturnValue(throwError(() => new Error('Bulk get failed')));
      fixture.detectChanges();
      expect(component.data.resources).toEqual([]);
      expect(component.isLoading).toBe(false);
    });

    it('should properly unsubscribe onDestroy$ and not memory leak on destroy', () => {
      fixture.detectChanges();
      const nextSpy = vi.spyOn(component.onDestroy$, 'next');
      const completeSpy = vi.spyOn(component.onDestroy$, 'complete');

      component.ngOnDestroy();

      expect(nextSpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });

    it('should handle shelfChange$ triggers after component initialization', () => {
      fixture.detectChanges();
      const initSpy = vi.spyOn(component, 'ngOnInit');

      userServiceMock.shelfChange$.next();

      expect(initSpy).toHaveBeenCalled();
    });

    it('should handle setBadgesCourses with undefined foundation on doc', () => {
      const courses = [
        {
          _id: 'course_none',
          doc: { courseTitle: 'No Foundation Course', steps: [{ _id: 's1' }] },
          progress: [{ passed: true }]
        }
      ];
      component.setBadgesCourses(courses, []);
      expect(component.badgesCourses['none']).toBeDefined();
      expect(component.badgesCourses['none'].length).toBe(1);
    });

    it('should filter out archived teams from myTeams dataset', () => {
      couchServiceMock.bulkGet.mockImplementation((db: string) => {
        if (db === 'teams') {
          return of([
            { _id: 'team_active', name: 'Active Team', status: 'active' },
            { _id: 'team_archived', name: 'Archived Team', status: 'archived' }
          ]);
        }
        return of([]);
      });

      fixture.detectChanges();
      const teamIds = component.data.myTeams.map(t => t._id);
      expect(teamIds).toContain('team_active');
      expect(teamIds).not.toContain('team_archived');
    });
  });
});
