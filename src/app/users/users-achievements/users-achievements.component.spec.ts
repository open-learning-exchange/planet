import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { UsersAchievementsComponent } from './users-achievements.component';
import { UsersAchievementsService } from './users-achievements.service';
import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { PlanetMessageService } from '../../shared/planet-message.service';
import { CoursesService } from '../../courses/courses.service';
import { CertificationsService } from '../../manager-dashboard/certifications/certifications.service';
import { PdfService } from '../../shared/pdf.service';

describe('UsersAchievementsComponent', () => {
  let component: UsersAchievementsComponent;
  let fixture: ComponentFixture<UsersAchievementsComponent>;
  let couchService;

  const couchServiceMock = {
    get: vi.fn().mockReturnValue(of({}))
  };

  const defaultConfiguration = { code: 'local_code', parentCode: 'parent_code' };
  const stateServiceMock: { configuration: { code: string, parentCode?: string } } = {
    configuration: { code: 'local_code', parentCode: 'parent_code' }
  };

  beforeEach(() => {
    stateServiceMock.configuration = { ...defaultConfiguration };
    couchServiceMock.get.mockClear();
    TestBed.configureTestingModule({
      imports: [ UsersAchievementsComponent ],
      providers: [
        { provide: CouchService, useValue: couchServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: UserService, useValue: { get: vi.fn().mockReturnValue({ _id: 'org.couchdb.user:local', name: 'local' }) } },
        { provide: UsersAchievementsService, useValue: { getAchievements: vi.fn().mockReturnValue(of({})), isEmpty: vi.fn() } },
        { provide: CoursesService, useValue: {
          coursesListener$: vi.fn().mockReturnValue(of([])),
          progressListener$: vi.fn().mockReturnValue(of([])),
          requestCourses: vi.fn()
        } },
        { provide: CertificationsService, useValue: { getCertifications: vi.fn().mockReturnValue(of([])), isCourseCompleted: vi.fn() } },
        { provide: PdfService, useValue: { download: vi.fn() } },
        { provide: PlanetMessageService, useValue: { showAlert: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of({ get: () => null }) } },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting()
      ]
    });
    fixture = TestBed.createComponent(UsersAchievementsComponent);
    component = fixture.componentInstance;
    couchService = TestBed.inject(CouchService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initUser', () => {
    it('should get a local user from _users by couchdb user id', () => {
      component.initUser('local', 'local_code');
      expect(couchService.get).toHaveBeenCalledWith('_users/org.couchdb.user:local');
    });

    it('should treat a missing planet code as local', () => {
      component.initUser('local', null);
      expect(couchService.get).toHaveBeenCalledWith('_users/org.couchdb.user:local');
    });

    it('should get a parent user from parent_users by couchdb user id', () => {
      component.initUser('upstream', 'parent_code');
      expect(couchService.get).toHaveBeenCalledWith('parent_users/org.couchdb.user:upstream');
    });

    it('should get a child user from child_users by name and planet code', () => {
      component.initUser('downstream', 'child_code');
      expect(couchService.get).toHaveBeenCalledWith('child_users/downstream@child_code');
    });

    it('should set the user from the database response', () => {
      couchServiceMock.get.mockReturnValueOnce(of({ name: 'downstream', planetCode: 'child_code' }));
      component.initUser('downstream', 'child_code');
      expect(component.user).toEqual({ name: 'downstream', planetCode: 'child_code' });
    });
  });

  describe('userRelationship', () => {
    it('should return local when the planet code matches the configuration code', () => {
      expect(component.userRelationship('local_code')).toBe('local');
    });

    it('should return local when the planet code is missing', () => {
      expect(component.userRelationship(null)).toBe('local');
      expect(component.userRelationship(undefined)).toBe('local');
    });

    it('should return parent when the planet code matches the configuration parent code', () => {
      expect(component.userRelationship('parent_code')).toBe('parent');
    });

    it('should return child for any other planet code', () => {
      expect(component.userRelationship('child_code')).toBe('child');
    });

    it('should return local for a missing planet code even when the parent code is also missing', () => {
      stateServiceMock.configuration = { code: 'local_code', parentCode: undefined };
      expect(component.userRelationship(undefined)).toBe('local');
    });
  });
});
