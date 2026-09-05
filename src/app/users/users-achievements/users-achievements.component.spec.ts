import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
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
import { achievementVisibility } from './users-achievements.constants';

describe('UsersAchievementsComponent', () => {
  let component: UsersAchievementsComponent;
  let fixture: ComponentFixture<UsersAchievementsComponent>;
  let couchService;
  let pdfService;
  let usersAchievementsService;

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
        { provide: UserService, useValue: {
          get: vi.fn().mockReturnValue({ _id: 'org.couchdb.user:local', name: 'local', planetCode: 'local_code' }),
          isBetaEnabled: vi.fn().mockReturnValue(false)
        } },
        { provide: UsersAchievementsService, useValue: {
          getAchievements: vi.fn().mockReturnValue(of({})),
          isEmpty: vi.fn(),
          visibility: vi.fn().mockReturnValue(achievementVisibility())
        } },
        { provide: CoursesService, useValue: {
          coursesListener$: vi.fn().mockReturnValue(of([])),
          progressListener$: vi.fn().mockReturnValue(of([])),
          requestCourses: vi.fn()
        } },
        { provide: CertificationsService, useValue: { getCertifications: vi.fn().mockReturnValue(of([])), isCourseCompleted: vi.fn() } },
        { provide: PdfService, useValue: { download: vi.fn() } },
        { provide: PlanetMessageService, useValue: { showAlert: vi.fn() } },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} }, paramMap: of({ get: () => null }) } },
        provideHttpClient(withInterceptorsFromDi())
      ]
    });
    fixture = TestBed.createComponent(UsersAchievementsComponent);
    component = fixture.componentInstance;
    couchService = TestBed.inject(CouchService);
    pdfService = TestBed.inject(PdfService);
    usersAchievementsService = TestBed.inject(UsersAchievementsService);
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

  describe('section visibility', () => {
    const pdfText = () => JSON.stringify(pdfService.download.mock.calls[0][0].content);

    beforeEach(() => {
      component.user = { name: 'local', firstName: 'Local', birthplace: 'Nairobi' };
      component.achievements = {
        purpose: 'My purpose',
        goals: 'My goals',
        achievements: [ { title: 'An achievement' } ],
        links: [ { title: 'A link', url: 'https://example.com' } ],
        references: [ { name: 'A reference' } ]
      };
      component.visibility = achievementVisibility({ goals: false, references: false });
    });

    it('should show every section by default', () => {
      component.visibility = achievementVisibility();
      expect(component.isSectionVisible('goals')).toBe(true);
      expect(component.isSectionVisible('references')).toBe(true);
    });

    it('should hide sections the learner turned off from other viewers', () => {
      component.ownAchievements = false;
      expect(component.isSectionVisible('goals')).toBe(false);
      expect(component.isSectionVisible('purpose')).toBe(true);
    });

    it('should still show hidden sections to the learner', () => {
      component.ownAchievements = true;
      expect(component.isSectionVisible('goals')).toBe(true);
      expect(component.isSectionHidden('goals')).toBe(true);
      expect(component.isSectionHidden('purpose')).toBe(false);
    });

    it('should not mark sections as hidden for other viewers', () => {
      component.ownAchievements = false;
      expect(component.isSectionHidden('goals')).toBe(false);
    });

    it('should leave hidden sections out of the printed achievements', () => {
      component.generatePDF();
      const content = pdfText();
      expect(content).toContain('My purpose');
      expect(content).toContain('An achievement');
      expect(content).not.toContain('My goals');
      expect(content).not.toContain('A reference');
    });

    it('should leave personal details out of the printed achievements when hidden', () => {
      component.visibility = achievementVisibility({ personalInfo: false });
      component.generatePDF();
      expect(pdfText()).not.toContain('Nairobi');
    });

    it('should not link a hidden CV/Resume for other viewers', () => {
      component.ownAchievements = false;
      component.achievements = { _id: 'id', _attachments: { 'resume.pdf': {} } };
      component.visibility = achievementVisibility({ resume: false });
      expect(component.resumeUrl).toBe('');
      component.visibility = achievementVisibility();
      expect(component.resumeUrl).toContain('resume.pdf');
    });
  });
  describe('hidden section label', () => {
    const renderAchievements = (visibility) => {
      usersAchievementsService.getAchievements.mockReturnValue(
        of({ purpose: 'My purpose', goals: 'My goals', achievements: [], references: [], links: [] })
      );
      usersAchievementsService.isEmpty.mockReturnValue(false);
      usersAchievementsService.visibility.mockReturnValue(achievementVisibility(visibility));
      fixture.detectChanges();
      component.isLoading = false;
      fixture.detectChanges();
      return fixture.nativeElement.querySelectorAll('.achievement-hidden-label');
    };

    it('should mark only the sections the learner hid on their own page', () => {
      expect(renderAchievements({ goals: false }).length).toBe(1);
    });

    it('should not mark any section when everything is shared', () => {
      expect(renderAchievements({}).length).toBe(0);
    });
  });
});
