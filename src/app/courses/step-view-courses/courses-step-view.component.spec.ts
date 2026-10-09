import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { CoursesStepViewComponent } from './courses-step-view.component';

describe('CoursesStepViewComponent', () => {
  let component: CoursesStepViewComponent;
  let routerMock: any;
  let submissionsServiceMock: any;

  beforeEach(() => {
    submissionsServiceMock = {
      submissionUpdated$: new Subject(),
      nextQuestion: vi.fn().mockReturnValue(0)
    };
    routerMock = { navigate: vi.fn() };
    component = new CoursesStepViewComponent(
      {} as any, { updateProgress: vi.fn() } as any, {} as any, {} as any,
      routerMock, { snapshot: { data: {} } } as any, {} as any,
      submissionsServiceMock, { get: vi.fn() } as any,
      { getDeviceType: () => 'desktop' } as any, {} as any
    );
    component.isLoading = false;
  });

  it('enforces passingRequired in canProceedToNextStep', () => {
    component.stepNum = 1;
    component.maxStep = 2;
    component.stepDetail = { exam: { questions: [ {} ] }, passingRequired: true };
    component.attempts = 1;
    component.examPassed = false;
    expect(component.canProceedToNextStep()).toBe(false);

    component.examPassed = true;
    expect(component.canProceedToNextStep()).toBe(true);
  });

  it('only marks examPassed when submission is complete and meets passing threshold', () => {
    component.stepNum = 1;
    component.stepDetail = { exam: { totalMarks: 10, passingPercentage: 80 } };
    component.courseId = 'c1';
    component.progress = { passed: false };
    component.getSubmission();

    submissionsServiceMock.submissionUpdated$.next({
      submission: { answers: [ { grade: 10 } ] },
      attempts: 1,
      bestAttempt: { grade: 10, status: 'requires grading' }
    });
    expect(component.examPassed).toBe(false);

    submissionsServiceMock.submissionUpdated$.next({
      submission: { answers: [ { grade: 8 } ] },
      attempts: 1,
      bestAttempt: { grade: 8, status: 'complete' }
    });
    expect(component.examPassed).toBe(true);
  });

  it('redirects when attempting to access a locked step', () => {
    const course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2', exam: { questions: [ {} ] } }
      ]
    };
    component.stepNum = 2;
    component.initCourse(course, [ { stepNum: 1, passed: false } ], [], []);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '../1' ], expect.any(Object));
  });

  it('exempts course managers from step locks and allows proceeding', () => {
    component.canManage = true;
    const course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2' }
      ]
    };
    expect(component.isStepLocked(1, course, [ { stepNum: 1, passed: false } ])).toBe(false);

    component.stepNum = 1;
    component.maxStep = 2;
    component.stepDetail = { exam: { questions: [ {} ] }, passingRequired: true };
    component.examPassed = false;
    expect(component.canProceedToNextStep()).toBe(true);
  });

  it('prioritizes passed progress doc when multiple progress records exist for a step', () => {
    const course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: true },
        { stepTitle: 'Step 2' }
      ]
    };
    const progress = [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true } ];
    expect(component.isStepLocked(1, course, progress)).toBe(false);
  });

  it('does not lock steps when preceding exam does not require passing', () => {
    const course = {
      _id: 'c1',
      steps: [
        { stepTitle: 'Step 1', exam: { questions: [ {} ] }, passingRequired: false },
        { stepTitle: 'Step 2' }
      ]
    };
    expect(component.isStepLocked(1, course, [])).toBe(false);
  });
});
