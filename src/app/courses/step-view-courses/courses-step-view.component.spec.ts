import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { CoursesService } from '../courses.service';
import { CoursesStepViewComponent } from './courses-step-view.component';

describe('CoursesStepViewComponent', () => {
  let component: CoursesStepViewComponent;
  let routerMock: any;
  let coursesServiceMock: any;
  let submissionsServiceMock: any;

  const lockedCourse = {
    _id: 'c1',
    steps: [
      { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
      { stepTitle: 'Step 2', exam: { questions: [ {} ] } }
    ]
  };

  beforeEach(() => {
    coursesServiceMock = { updateProgress: vi.fn() };
    submissionsServiceMock = {
      submissionUpdated$: new Subject(),
      nextQuestion: vi.fn().mockReturnValue(0)
    };
    routerMock = { navigate: vi.fn() };
    component = new CoursesStepViewComponent(
      {} as any, coursesServiceMock, {} as any, {} as any,
      routerMock, { snapshot: { data: {} } } as any, {} as any,
      submissionsServiceMock, { get: vi.fn() } as any,
      { isMobile: signal(false) } as any, {} as any
    );
    component.isLoading = false;
  });

  it('enables Next on a passingRequired step only once the pass is saved', () => {
    component.stepNum = 1;
    component.maxStep = 2;
    component.stepDetail = { exam: { questions: [ {} ] }, passingRequired: true };
    component.attempts = 1;
    component.examPassed = true;
    component.progress = { passed: false };
    expect(component.canProceedToNextStep()).toBe(false);

    component.progress = { passed: true };
    expect(component.canProceedToNextStep()).toBe(true);
  });

  describe('exam results', () => {
    const result = (grade: number, parentId = 'e1@c1') => ({
      submission: { parentId, answers: [] },
      attempts: 1,
      bestAttempt: { grade, status: 'complete' }
    });

    beforeEach(() => {
      component.stepNum = 1;
      component.courseId = 'c1';
      component.stepDetail = { exam: { _id: 'e1', totalMarks: 10, passingPercentage: 80 } };
      component.getSubmission();
    });

    it('writes a pass once the best completed attempt meets the threshold', () => {
      component.progress = { passed: false };
      submissionsServiceMock.submissionUpdated$.next(result(7));
      expect(component.examPassed).toBe(false);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();

      submissionsServiceMock.submissionUpdated$.next(result(8));
      expect(component.examPassed).toBe(true);
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed: true });
    });

    it('passes at exactly the pass mark', () => {
      component.stepDetail.exam = { _id: 'e1', totalMarks: 50, passingPercentage: 58 };
      component.progress = { passed: false };
      submissionsServiceMock.submissionUpdated$.next(result(29));
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed: true });
    });

    it('keeps a stored pass without writing when no visible attempt passes', () => {
      component.progress = { passed: true };
      submissionsServiceMock.submissionUpdated$.next(result(0));
      expect(component.examPassed).toBe(true);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();
    });

    it.each([ undefined, { grade: 0 }, { grade: 10, status: 'pending' }, { grade: 10, status: 'ungraded' } ])(
      'does not pass a zero-threshold exam without a completed attempt (%j)', (bestAttempt) => {
        component.stepDetail.exam.passingPercentage = 0;
        component.progress = { passed: false };

        submissionsServiceMock.submissionUpdated$.next({ ...result(0), attempts: 0, bestAttempt });

        expect(component.examPassed).toBe(false);
        expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();
      }
    );

    it('passes a zero-threshold exam after a completed attempt graded zero', () => {
      component.stepDetail.exam.passingPercentage = 0;
      component.progress = { passed: false };

      submissionsServiceMock.submissionUpdated$.next(result(0));

      expect(component.examPassed).toBe(true);
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed: true });
    });

    it('ignores a late result that belongs to another exam', () => {
      component.progress = { passed: false };
      submissionsServiceMock.submissionUpdated$.next(result(10, 'e0@c1'));
      expect(component.examPassed).toBe(false);
      expect(component.attempts).toBe(0);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();
    });
  });

  it.each([ true, false ])('honors the read-only context for an admin when parent is %s', (parent) => {
    const courseUpdated$ = new Subject();
    const authorizationService = new CoursesService(
      {} as any, { get: () => ({ isUserAdmin: true }) } as any,
      { ratingsUpdated$: of(undefined) } as any, {} as any,
      { couchStateListener: () => of(undefined) } as any, {} as any, {} as any, {} as any
    );
    Object.assign(coursesServiceMock, {
      courseUpdated$,
      canManageCourse: authorizationService.canManageCourse.bind(authorizationService),
      requestCourse: vi.fn(),
      courseActivity: vi.fn()
    });
    submissionsServiceMock.openSubmission = vi.fn();
    component = new CoursesStepViewComponent(
      { listAIProviders: () => of([]) } as any, coursesServiceMock, {} as any,
      { resourcesListener: () => of([]), requestResourcesUpdate: vi.fn() } as any, routerMock,
      { snapshot: { data: { parent } }, paramMap: of(new Map([ [ 'stepNum', '1' ], [ 'id', 'c1' ] ])) } as any,
      { getCouchState: () => of([]) } as any, submissionsServiceMock,
      { get: vi.fn(), shelf: { courseIds: [] } } as any, { isMobile: signal(false) } as any, {} as any
    );

    component.ngOnInit();
    courseUpdated$.next({ course: { _id: 'c1', steps: [ { resources: [], exam: { _id: 'e1', questions: [ {} ] } } ] } });

    expect(component.canManage).toBe(!parent);
    expect(component.hasActionButtons).toBe(!parent);
    component.ngOnDestroy();
  });

  it('redirects a locked step to the step that must be passed, replacing the history entry', () => {
    component.stepNum = 2;
    expect(component.redirectFromLockedStep(lockedCourse, [ { stepNum: 1, passed: false } ])).toBe(true);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '../1' ], expect.objectContaining({ replaceUrl: true }));
  });

  it('exempts course managers from step locks and allows proceeding', () => {
    component.canManage = true;
    component.stepNum = 2;
    expect(component.redirectFromLockedStep(lockedCourse, [ { stepNum: 1, passed: false } ])).toBe(false);

    component.stepNum = 1;
    component.maxStep = 2;
    component.stepDetail = { exam: { questions: [ {} ] }, passingRequired: true };
    component.examPassed = false;
    expect(component.canProceedToNextStep()).toBe(true);
  });

  it('counts a step as passed when any of its progress records passed', () => {
    component.stepNum = 2;
    expect(component.redirectFromLockedStep(lockedCourse, [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true } ])).toBe(false);
  });

  it('does not lock steps when the preceding exam does not require passing', () => {
    component.stepNum = 2;
    const course = { _id: 'c1', steps: [ { ...lockedCourse.steps[0], passingRequired: false }, lockedCourse.steps[1] ] };
    expect(component.redirectFromLockedStep(course, [])).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
