import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesViewComponent } from './courses-view.component';

describe('CoursesViewComponent enrollment', () => {
  const createComponent = (coursesService: any, dialog: any = { open: vi.fn() }) => {
    const component = new CoursesViewComponent(
      { navigate: vi.fn() } as any,
      { get: vi.fn().mockReturnValue({}), shelf: { courseIds: [ 'course-1' ] } } as any,
      { snapshot: { data: { parent: false } } } as any,
      coursesService,
      {} as any,
      { configuration: {} } as any,
      { deviceType: signal(undefined) } as any,
      dialog
    );
    component.courseDetail = { courseTitle: 'Course 1' };
    return component;
  };

  it('leaves the course only after the confirmation request runs', () => {
    const dialogRef = { close: vi.fn() };
    const dialog = { open: vi.fn().mockReturnValue(dialogRef) };
    const coursesService = {
      courseResignAdmission: vi.fn().mockReturnValue(of({}))
    };
    const component = createComponent(coursesService, dialog);
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

  it('marks the course as joined after joining, even if it already showed as joined', () => {
    const coursesService = { courseResignAdmission: vi.fn().mockReturnValue(of({})) };
    const component = createComponent(coursesService);
    component.isUserEnrolled = true;

    component.courseToggle('course-1', 'admission');

    expect(coursesService.courseResignAdmission).toHaveBeenCalledWith('course-1', 'admission', 'Course 1');
    expect(component.isUserEnrolled).toBe(true);
  });
});
