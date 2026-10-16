import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CoursesSubmissionsComponent } from './courses-submissions.component';

describe('CoursesSubmissionsComponent', () => {
  let routerMock: any;
  let couchServiceMock: any;
  let coursesServiceMock: any;
  const course = { _id: 'course_123', courseTitle: 'Math 101', creator: 'teacher@ole' };

  const createComponent = ({ id = 'course_123', data = {} }: { id?: string | null, data?: any } = {}) =>
    new CoursesSubmissionsComponent(
      routerMock,
      { snapshot: { data, paramMap: { get: () => id } } } as any,
      couchServiceMock,
      coursesServiceMock
    );

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    couchServiceMock = { get: vi.fn().mockReturnValue(of(course)) };
    coursesServiceMock = { canManageCourse: vi.fn().mockReturnValue(true) };
  });

  it('should show the submissions once the course loads', () => {
    const component = createComponent();
    component.ngOnInit();
    expect(couchServiceMock.get).toHaveBeenCalledWith('courses/course_123');
    expect(component.course).toBe(course);
    expect(component.courseId).toBe(course._id);
    expect(component.isLoading).toBe(false);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should redirect without showing the submissions when the user cannot manage the course', () => {
    coursesServiceMock.canManageCourse.mockReturnValue(false);
    const component = createComponent();
    component.ngOnInit();
    expect(component.course).toBeUndefined();
    expect(component.isLoading).toBe(true);
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });

  it('should redirect when the course cannot be fetched', () => {
    couchServiceMock.get.mockReturnValue(throwError(() => 'not found'));
    const component = createComponent();
    component.ngOnInit();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });

  it('should redirect to the manager list in parent context without fetching', () => {
    const component = createComponent({ data: { parent: true } });
    component.ngOnInit();
    expect(couchServiceMock.get).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/manager/courses' ]);
  });

  it('should redirect without fetching when the course id is missing', () => {
    const component = createComponent({ id: null });
    component.ngOnInit();
    expect(couchServiceMock.get).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });
});
