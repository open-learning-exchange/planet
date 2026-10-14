import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesViewComponent } from './courses-view.component';

describe('CoursesViewComponent enrollment', () => {
  const createComponent = (coursesService: any, dialog: any = { open: vi.fn() }, ratingService: any = {}) => {
    const component = new CoursesViewComponent(
      { navigate: vi.fn() } as any,
      { get: vi.fn().mockReturnValue({}), shelf: { courseIds: [ 'course-1' ] } } as any,
      { snapshot: { data: { parent: false } } } as any,
      coursesService,
      {} as any,
      { configuration: {} } as any,
      { deviceType: signal(undefined) } as any,
      dialog,
      ratingService
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

  it('prompts for a rating on leaving, except into its own pages or from a parent view', () => {
    const ratingService = { promptRating: vi.fn().mockReturnValue(of(true)) };
    const component = createComponent({}, undefined, ratingService);
    component.courseDetail._id = 'course-1';
    const leave = (url: string) => component.canDeactivate(undefined, undefined, { url } as any);

    [
      '/courses/view/course-1/step/2/exam;type=survey',
      '/myDashboard/myCourses/view/course-1/step/1',
      '/courses/view/course-1/update',
      '/courses/progress/course-1',
      '/courses/enrolled/course-1?tab=1'
    ].forEach(url => expect(leave(url), url).toBe(true));
    expect(ratingService.promptRating).not.toHaveBeenCalled();

    [ '/courses/view/course-10', '/courses/submissions/course-1', '/teams/view/x/courses' ].forEach(leave);
    expect(ratingService.promptRating).toHaveBeenCalledTimes(3);
    expect(ratingService.promptRating).toHaveBeenCalledWith(component.courseDetail, 'course');

    ratingService.promptRating.mockClear();
    component.parent = true;
    expect(leave('/courses')).toBe(true);
    expect(ratingService.promptRating).not.toHaveBeenCalled();
  });
});
