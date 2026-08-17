import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { CoursesProgressLeaderComponent } from './courses-progress-leader.component';

describe('CoursesProgressLeaderComponent', () => {
  let component: CoursesProgressLeaderComponent;
  let routerMock: any;
  let routeMock: any;
  let coursesServiceMock: any;
  let submissionsServiceMock: any;
  let csvServiceMock: any;
  let dialogMock: any;
  let stateServiceMock: any;
  let deviceInfoServiceMock: any;
  let courseUpdated$: Subject<any>;
  let submissionsUpdated$: Subject<any>;

  beforeEach(() => {
    courseUpdated$ = new Subject<any>();
    submissionsUpdated$ = new Subject<any>();

    routerMock = {
      navigate: vi.fn()
    };
    routeMock = {
      paramMap: of({ get: (key: string) => key === 'id' ? 'course_123' : null })
    };
    coursesServiceMock = {
      requestCourse: vi.fn(),
      findProgress: vi.fn().mockReturnValue(of([])),
      courseUpdated$: courseUpdated$.asObservable()
    };
    submissionsServiceMock = {
      updateSubmissions: vi.fn(),
      submissionsUpdated$: submissionsUpdated$.asObservable()
    };
    csvServiceMock = {
      exportCSV: vi.fn()
    };
    dialogMock = {
      open: vi.fn()
    };
    stateServiceMock = {
      configuration: { name: 'Test Community' }
    };
    deviceInfoServiceMock = {
      watchDeviceType: vi.fn().mockReturnValue(of('desktop'))
    };

    component = new CoursesProgressLeaderComponent(
      routerMock,
      routeMock,
      coursesServiceMock,
      submissionsServiceMock,
      csvServiceMock,
      dialogMock,
      stateServiceMock,
      deviceInfoServiceMock
    );
  });

  it('should create CoursesProgressLeaderComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should request course on ngOnInit', () => {
    component.ngOnInit();
    expect(coursesServiceMock.requestCourse).toHaveBeenCalledWith({ courseId: 'course_123', forceLatest: true });
  });

  it('should calculate KPI metrics when course and submissions update', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: {
        _id: 'course_123',
        courseTitle: 'Algebra 101',
        steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
      }
    });

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_123',
        status: 'complete',
        source: 'community_1',
        user: { name: 'Student 1', planetCode: 'community_1' },
        answers: [ { grade: 1, mistakes: 0 } ]
      }
    ]);

    expect(component.headingStart).toBe('Algebra 101');
    expect(component.totalLearners).toBe(1);
    expect(component.avgCompletionPercentage).toBe(100);
    expect(component.pendingGradesCount).toBe(0);
  });

  it('should mark step as complete when exam is finished with correct answers, even if mistakes were recorded on trial 1', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: {
        _id: 'course_123',
        courseTitle: 'Algebra 101',
        steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
      }
    });

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_123',
        status: 'complete',
        source: 'community_1',
        user: { name: 'Student 1', planetCode: 'community_1' },
        answers: [ { grade: 1, mistakes: 2 } ]
      }
    ]);

    expect(component.dataSource.data[0].stepStatuses[0].status).toBe('complete');
    expect(component.dataSource.data[0].totalErrors).toBe(2);
    expect(component.dataSource.data[0].completionPercentage).toBe(100);
    expect(component.avgCompletionPercentage).toBe(100);
    expect(component.stepDifficultyList[0].passPercentage).toBe(100);
    expect(component.stepDifficultyList[0].totalErrors).toBe(2);
  });

  it('should mark step as failed if submission status is complete but contains failing grades (grade 0)', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: {
        _id: 'course_123',
        courseTitle: 'Algebra 101',
        steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
      }
    });

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_123',
        status: 'complete',
        source: 'community_1',
        user: { name: 'Student 1', planetCode: 'community_1' },
        answers: [ { grade: 0, mistakes: 1 } ]
      }
    ]);

    expect(component.dataSource.data[0].stepStatuses[0].status).toBe('failed');
    expect(component.dataSource.data[0].totalErrors).toBe(1);
    expect(component.dataSource.data[0].completionPercentage).toBe(0);
    expect(component.avgCompletionPercentage).toBe(0);
    expect(component.stepDifficultyList[0].passPercentage).toBe(0);
  });

  it('should sum mistakes across retake attempts while marking step complete if any attempt passed', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: {
        _id: 'course_123',
        courseTitle: 'Algebra 101',
        steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
      }
    });

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_123',
        status: 'complete',
        source: 'community_1',
        user: { name: 'Student 1', planetCode: 'community_1' },
        answers: [ { grade: 0, mistakes: 1 } ]
      },
      {
        _id: 'sub_2',
        parentId: 'exam_1@course_123',
        status: 'complete',
        source: 'community_1',
        user: { name: 'Student 1', planetCode: 'community_1' },
        answers: [ { grade: 1, mistakes: 2 } ]
      }
    ]);

    expect(component.dataSource.data[0].stepStatuses[0].status).toBe('complete');
    expect(component.dataSource.data[0].totalErrors).toBe(3);
    expect(component.totalErrorsCount).toBe(3);
    expect(component.stepDifficultyList[0].totalErrors).toBe(3);
    expect(component.stepDifficultyList[0].passPercentage).toBe(100);
  });

  it('should require both exam and survey to be completed for step to be marked complete', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: {
        _id: 'course_123',
        courseTitle: 'Algebra 101',
        steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' }, survey: { _id: 'survey_1' } } ]
      }
    });

    submissionsUpdated$.next([
      {
        _id: 'sub_1',
        parentId: 'exam_1@course_123',
        status: 'complete',
        source: 'community_1',
        user: { name: 'Student 1', planetCode: 'community_1' },
        answers: [ { grade: 1, mistakes: 0 } ]
      }
    ]);

    // Exam is submitted but Survey is missing, so step must be in_progress and not complete
    expect(component.dataSource.data[0].stepStatuses[0].status).toBe('in_progress');
    expect(component.dataSource.data[0].completionPercentage).toBe(0);
  });

  it('should navigate to grading page when navigateToGrading is called', () => {
    component.navigateToGrading();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/myDashboard/submissions' ]);
  });

  it('should navigate to /courses on navigateBack', () => {
    component.navigateBack();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });

  it('should set passPercentage to null when a step has 0 submissions', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: {
        _id: 'course_123',
        courseTitle: 'Algebra 101',
        steps: [ { stepTitle: 'Step 1', exam: { _id: 'exam_1' } } ]
      }
    });

    submissionsUpdated$.next([]);

    expect(component.stepDifficultyList[0].passPercentage).toBeNull();
    expect(component.stepDifficultyList[0].submissionCount).toBe(0);
  });

  it('should navigate to full profile page on memberClick', () => {
    component.memberClick({ name: 'Student 1' });
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/users/profile', 'Student 1' ]);
  });
});
