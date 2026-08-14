import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { CoursesStepViewComponent } from './courses-step-view.component';
import { CoursesService } from '../courses.service';
import { SubmissionsService, RetakePolicyStatus } from '../../submissions/submissions.service';
import { ResourcesService } from '../../resources/resources.service';
import { StateService } from '../../shared/state.service';
import { ChatService } from '../../shared/chat.service';
import { UserService } from '../../shared/user.service';
import { DeviceInfoService } from '../../shared/device-info.service';
import { ChallengesService } from '../../shared/challenges/challenges.service';

describe('CoursesStepViewComponent Retake Limits', () => {
  let component: CoursesStepViewComponent;
  let fixture: ComponentFixture<CoursesStepViewComponent>;
  let router: any;

  const submissionUpdated$ = new Subject<any>();

  const coursesServiceMock = {
    courseUpdated$: new Subject<any>(),
    courseActivity: vi.fn(),
    requestCourse: vi.fn(),
    updateProgress: vi.fn(),
    stepResourceSort: vi.fn(),
    stepHasExamSurveyBoth: vi.fn()
  };

  const submissionsServiceMock = {
    submissionUpdated$,
    openSubmission: vi.fn(),
    nextQuestion: vi.fn().mockReturnValue(0)
  };

  const resourcesServiceMock = {
    resourcesListener: vi.fn().mockReturnValue(of([])),
    requestResourcesUpdate: vi.fn()
  };

  const stateServiceMock = {
    getCouchState: vi.fn().mockReturnValue(of([]))
  };

  const chatServiceMock = {
    listAIProviders: vi.fn().mockReturnValue(of([]))
  };

  const userServiceMock = {
    get: vi.fn().mockReturnValue({ isUserAdmin: false, name: 'learner', planetCode: 'planet_1' }),
    shelf: { courseIds: ['course_1'] }
  };

  const deviceInfoServiceMock = {
    getDeviceType: vi.fn().mockReturnValue('desktop'),
    watchDeviceType: vi.fn().mockReturnValue(of('desktop'))
  };

  const challengesServiceMock = {
    getActiveChallengeForCourse: vi.fn().mockReturnValue(null),
    openChallengeDialog: vi.fn()
  };

  beforeEach(() => {
    router = {
      navigate: vi.fn()
    };

    TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        CoursesStepViewComponent
      ],
      providers: [
        { provide: CoursesService, useValue: coursesServiceMock },
        { provide: SubmissionsService, useValue: submissionsServiceMock },
        { provide: ResourcesService, useValue: resourcesServiceMock },
        { provide: StateService, useValue: stateServiceMock },
        { provide: ChatService, useValue: chatServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: DeviceInfoService, useValue: deviceInfoServiceMock },
        { provide: ChallengesService, useValue: challengesServiceMock },
        { provide: MatDialog, useValue: {} },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { parent: false },
              params: {},
              paramMap: { get: (k: string) => (k === 'stepNum' ? '1' : 'course_1') }
            },
            paramMap: of({ get: (k: string) => (k === 'stepNum' ? '1' : 'course_1') })
          }
        }
      ]
    });

    fixture = TestBed.createComponent(CoursesStepViewComponent);
    component = fixture.componentInstance;
    component.stepDetail = {
      stepTitle: 'Quiz Step',
      description: 'Test step description',
      resources: [],
      exam: { _id: 'exam_1', totalMarks: 10, passingPercentage: 100, questions: [{}] }
    };
    component.courseId = 'course_1';
    component.stepNum = 1;
    component.isUserEnrolled = true;
    component.progress = { passed: false };
  });

  it('should allow taking the exam when retake policy allows it', () => {
    const retakePolicy: RetakePolicyStatus = {
      maxAttempts: 3,
      attemptsUsed: 1,
      effectiveMaxAttempts: 3,
      isMaxAttemptsReached: false,
      isCooloffActive: false,
      cooloffRemainingMs: 0,
      cooloffRemainingFormatted: '',
      canStartExam: true
    };

    component.retakePolicy = retakePolicy;
    component.attempts = 1;

    component.goToExam('exam');
    expect(router.navigate).toHaveBeenCalledWith(
      ['exam', { id: 'course_1', stepNum: 1, questionNum: 1, type: 'exam', preview: false, examId: 'exam_1' }],
      { relativeTo: expect.anything() }
    );
  });

  it('should prevent launching exam when maxAttempts limit is reached', () => {
    const retakePolicy: RetakePolicyStatus = {
      maxAttempts: 2,
      attemptsUsed: 2,
      effectiveMaxAttempts: 2,
      isMaxAttemptsReached: true,
      isCooloffActive: false,
      cooloffRemainingMs: 0,
      cooloffRemainingFormatted: '',
      canStartExam: false
    };

    component.retakePolicy = retakePolicy;
    component.attempts = 2;

    component.goToExam('exam');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should prevent launching exam when cool-off lockout is active', () => {
    const retakePolicy: RetakePolicyStatus = {
      maxAttempts: 0,
      attemptsUsed: 1,
      effectiveMaxAttempts: 0,
      isMaxAttemptsReached: false,
      isCooloffActive: true,
      cooloffRemainingMs: 4 * 3600000,
      cooloffRemainingFormatted: '4h',
      canStartExam: false
    };

    component.retakePolicy = retakePolicy;
    component.attempts = 1;

    component.goToExam('exam');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should tick and expire cool-off in real time when active', () => {
    vi.useFakeTimers();
    component.getSubmission();

    const retakePolicy: RetakePolicyStatus = {
      maxAttempts: 0,
      attemptsUsed: 1,
      effectiveMaxAttempts: 0,
      isMaxAttemptsReached: false,
      isCooloffActive: true,
      cooloffRemainingMs: 3000,
      cooloffRemainingFormatted: '1m',
      canStartExam: false
    };

    submissionUpdated$.next({
      submission: { answers: [] },
      attempts: 1,
      bestAttempt: { grade: 0 },
      retakePolicy
    });

    expect(component.retakePolicy?.isCooloffActive).toBe(true);
    expect(component.retakePolicy?.canStartExam).toBe(false);

    // Fast-forward 4 seconds
    vi.advanceTimersByTime(4000);

    expect(component.retakePolicy?.isCooloffActive).toBe(false);
    expect(component.retakePolicy?.canStartExam).toBe(true);
    expect(component.retakePolicy?.cooloffRemainingFormatted).toBe('');
    vi.useRealTimers();
  });
});
