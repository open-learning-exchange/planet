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

  it('should navigate to grading page when navigateToGrading is called', () => {
    component.course = { _id: 'course_123' };
    component.navigateToGrading();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses/submissions', 'course_123' ]);
  });

  it('should navigate to /courses on navigateBack', () => {
    component.navigateBack();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });
});
