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
      {} as any, coursesServiceMock, {} as any,
      routerMock, { snapshot: { data: {} } } as any, {} as any,
      submissionsServiceMock, { get: vi.fn(), shelf: { courseIds: [] } } as any,
      { isMobile: signal(false) } as any, {} as any, {} as any
    );
    component.isLoading = false;
  });

  it('shows the library\'s copy of each step resource it can open and counts the rest', () => {
    component.stepNum = 1;
    coursesServiceMock.stepResourceSort = (a, b) => a.title.localeCompare(b.title);
    const fileAddedLater = { _id: 'file-added-later', title: 'A', _attachments: { 'a.pdf': {} } };
    const other = { _id: 'other', title: 'B', _attachments: { 'b.pdf': {} } };
    const resources = [ { _id: 'deleted', title: '0' }, { _id: 'file-added-later', title: 'A' }, other ];
    const course = { _id: 'c1', steps: [ { resources } ] };
    const library = new Map<string, any>([ [ 'file-added-later', fileAddedLater ], [ 'other', other ] ]);

    component.initCourse(course, [], library, []);

    expect(component.stepDetail.resources).toEqual([ fileAddedLater, other ]);
    expect(component.stepDetail.unavailableResources).toBe(1);
    expect(component.resource).toBe(fileAddedLater);
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
    const result = (passed: boolean, parentId = 'e1@c1') => ({ submission: { parentId, answers: [] }, attempts: 1, passed });

    beforeEach(() => {
      component.stepNum = 1;
      component.courseId = 'c1';
      component.stepDetail = { exam: { _id: 'e1' } };
      component.getSubmission();
    });

    it('writes a pass once an attempt passes', () => {
      component.progress = { passed: false };
      submissionsServiceMock.submissionUpdated$.next(result(false));
      expect(component.examPassed).toBe(false);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();

      submissionsServiceMock.submissionUpdated$.next(result(true));
      expect(component.examPassed).toBe(true);
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed: true });
    });

    it('keeps a stored pass without writing when no attempt passes', () => {
      component.progress = { passed: true };
      submissionsServiceMock.submissionUpdated$.next(result(false));
      expect(component.examPassed).toBe(true);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();
    });

    it('ignores a late result that belongs to another exam', () => {
      component.progress = { passed: false };
      submissionsServiceMock.submissionUpdated$.next(result(true, 'e0@c1'));
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
      libraryStepResources: () => of(new Map()),
      requestCourse: vi.fn(),
      courseActivity: vi.fn()
    });
    submissionsServiceMock.openSubmission = vi.fn();
    component = new CoursesStepViewComponent(
      { listAIProviders: () => of([]) } as any, coursesServiceMock, {} as any, routerMock,
      { snapshot: { data: { parent } }, paramMap: of(new Map([ [ 'stepNum', '1' ], [ 'id', 'c1' ] ])) } as any,
      { getCouchState: () => of([]) } as any, submissionsServiceMock,
      { get: vi.fn(), shelf: { courseIds: [] } } as any, { isMobile: signal(false) } as any, {} as any, {} as any
    );

    component.ngOnInit();
    courseUpdated$.next({ course: { _id: 'c1', steps: [ { resources: [], exam: { _id: 'e1', questions: [ {} ] } } ] } });

    expect(component.canManage).toBe(!parent);
    expect(component.hasActionButtons).toBe(!parent);
    component.ngOnDestroy();
  });

  it('redirects a locked step to the step that must be passed, replacing the history entry', () => {
    component.stepNum = 2;
    expect(component.redirectFromUnavailableStep(lockedCourse, [ { stepNum: 1, passed: false } ])).toBe(true);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '../1' ], expect.objectContaining({ replaceUrl: true }));
  });

  it('exempts course managers from step locks and allows proceeding', () => {
    component.canManage = true;
    component.stepNum = 2;
    expect(component.redirectFromUnavailableStep(lockedCourse, [ { stepNum: 1, passed: false } ])).toBe(false);

    component.stepNum = 1;
    component.maxStep = 2;
    component.stepDetail = { exam: { questions: [ {} ] }, passingRequired: true };
    component.examPassed = false;
    expect(component.canProceedToNextStep()).toBe(true);
  });

  it('counts a step as passed when any of its progress records passed', () => {
    component.stepNum = 2;
    const progress = [ { stepNum: 1, passed: false }, { stepNum: 1, passed: true } ];
    expect(component.redirectFromUnavailableStep(lockedCourse, progress)).toBe(false);
  });

  it('does not lock steps when the preceding exam does not require passing', () => {
    component.stepNum = 2;
    const course = { _id: 'c1', steps: [ { ...lockedCourse.steps[0], passingRequired: false }, lockedCourse.steps[1] ] };
    expect(component.redirectFromUnavailableStep(course, [])).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it.each([ [ 0, 1 ], [ -2, 1 ], [ +'abc', 1 ], [ 1.5, 1 ], [ 9, 2 ] ])(
    'redirects step %s to step %s, replacing the history entry', (stepNum, target) => {
      component.canManage = true;
      component.stepNum = stepNum;
      expect(component.redirectFromUnavailableStep(lockedCourse, [])).toBe(true);
      expect(routerMock.navigate).toHaveBeenCalledWith([ `../${target}` ], expect.objectContaining({ replaceUrl: true }));
    }
  );

  it.each([ 0, 1 ])('redirects step %s to the course page when the course has no steps', (stepNum) => {
    component.stepNum = stepNum;
    expect(component.redirectFromUnavailableStep({ _id: 'c1', steps: [] }, [])).toBe(true);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '../../' ], expect.objectContaining({ replaceUrl: true }));
  });

  describe('progress on open', () => {
    const openStep = (exam, progress = [], exams = []) => {
      component.initCourse({ _id: 'c1', steps: [ { resources: [], exam } ] }, progress, new Map(), exams);
    };

    beforeEach(() => {
      vi.spyOn(component, 'checkMyCourses').mockReturnValue(true);
      submissionsServiceMock.openSubmission = vi.fn();
      component.stepNum = 1;
    });

    it.each([ [ [], true ], [ [ {} ], false ] ])('saves a step whose test has questions %j as passed: %s', (questions, passed) => {
      openStep({ _id: 'e1', questions });
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed });
    });

    it('judges the test by the exams doc when it is ahead of the course copy', () => {
      openStep({ _id: 'e1', questions: [] }, [], [ { _id: 'e1', questions: [ {} ] } ]);
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed: false });
    });

    it('rewrites a stored fail as a pass on a step without a test', () => {
      openStep(undefined, [ { stepNum: 1, passed: false } ]);
      expect(coursesServiceMock.updateProgress).toHaveBeenCalledWith({ courseId: 'c1', stepNum: 1, passed: true });
    });

    it('keeps a stored fail on a step with a test', () => {
      openStep({ _id: 'e1', questions: [ {} ] }, [ { stepNum: 1, passed: false } ]);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();
    });

    it('writes nothing for a step without a test that is already passed', () => {
      openStep(undefined, [ { stepNum: 1, passed: true } ]);
      expect(coursesServiceMock.updateProgress).not.toHaveBeenCalled();
    });
  });
});
