import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesViewComponent } from './courses-view.component';

describe('CoursesViewComponent leave confirmation', () => {
  it('leaves the course only after the confirmation request runs', () => {
    const dialogRef = { close: vi.fn() };
    const dialog = { open: vi.fn().mockReturnValue(dialogRef) };
    const coursesService = {
      courseResignAdmission: vi.fn().mockReturnValue(of({}))
    };
    const component = new CoursesViewComponent(
      { navigate: vi.fn() } as any,
      { get: vi.fn().mockReturnValue({}), shelf: { courseIds: [ 'course-1' ] } } as any,
      { snapshot: { data: { parent: false } } } as any,
      coursesService as any,
      {} as any,
      { configuration: {} } as any,
      { watchDeviceType: vi.fn().mockReturnValue(of(undefined)) } as any,
      dialog as any
    );
    component.courseDetail = { courseTitle: 'Course 1' };
    component.isUserEnrolled = true;

    component.courseToggle('course-1', 'resign');

    const dialogData = dialog.open.mock.calls[0][1].data;
    expect(dialogData.displayName).toBe('Course 1');
    expect(coursesService.courseResignAdmission).not.toHaveBeenCalled();
    expect(component.isUserEnrolled).toBe(true);

    dialogData.okClick.request.subscribe(dialogData.okClick.onNext);

    expect(coursesService.courseResignAdmission).toHaveBeenCalledWith('course-1', 'resign', 'Course 1');
    expect(component.isUserEnrolled).toBe(false);
    expect(dialogRef.close).toHaveBeenCalled();
  });
});
