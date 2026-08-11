import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { CoursesSubmissionsComponent } from './courses-submissions.component';

describe('CoursesSubmissionsComponent', () => {
  let component: CoursesSubmissionsComponent;
  let routerMock: any;
  let routeMock: any;
  let coursesServiceMock: any;
  let userServiceMock: any;
  let deviceInfoServiceMock: any;
  let courseUpdated$: Subject<any>;

  beforeEach(() => {
    courseUpdated$ = new Subject<any>();

    routerMock = {
      navigate: vi.fn()
    };
    routeMock = {
      paramMap: of({ get: (key: string) => key === 'id' ? 'course_123' : null })
    };
    coursesServiceMock = {
      requestCourse: vi.fn(),
      courseUpdated$: courseUpdated$.asObservable()
    };
    userServiceMock = {
      get: vi.fn().mockReturnValue({ isUserAdmin: true, name: 'admin' })
    };
    deviceInfoServiceMock = {
      watchDeviceType: vi.fn().mockReturnValue(of('desktop'))
    };

    component = new CoursesSubmissionsComponent(
      routerMock,
      routeMock,
      coursesServiceMock,
      userServiceMock,
      deviceInfoServiceMock
    );
  });

  it('should create CoursesSubmissionsComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should request course on ngOnInit', () => {
    component.ngOnInit();
    expect(coursesServiceMock.requestCourse).toHaveBeenCalledWith({ courseId: 'course_123', forceLatest: true });
  });

  it('should update state when courseUpdated$ emits', () => {
    component.ngOnInit();
    courseUpdated$.next({
      course: { _id: 'course_123', courseTitle: 'Math 101', creator: 'admin@ole' }
    });
    expect(component.headingStart).toBe('Math 101');
    expect(component.canManage).toBe(true);
    expect(component.isLoading).toBe(false);
  });

  it('should navigate to /courses on navigateBack', () => {
    component.navigateBack();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });
});
