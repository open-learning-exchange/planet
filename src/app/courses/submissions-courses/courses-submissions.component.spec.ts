import { vi } from 'vitest';
import { CoursesSubmissionsComponent } from './courses-submissions.component';

describe('CoursesSubmissionsComponent', () => {
  let component: CoursesSubmissionsComponent;
  let routerMock: any;
  const course = { _id: 'course_123', courseTitle: 'Math 101', creator: 'teacher@ole' };

  beforeEach(() => {
    routerMock = { navigate: vi.fn() };
    component = new CoursesSubmissionsComponent(routerMock, { snapshot: { data: { course } } } as any);
  });

  it('should create CoursesSubmissionsComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should take the course resolved for the route', () => {
    expect(component.course).toBe(course);
    expect(component.courseId).toBe('course_123');
  });

  it('should navigate to the course list on navigateBack', () => {
    component.navigateBack();
    expect(routerMock.navigate).toHaveBeenCalledWith([ '/courses' ]);
  });
});
