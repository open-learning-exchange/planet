import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesService } from './courses.service';
import { TagsService } from '../shared/forms/tags.service';

describe('CoursesService', () => {
  it('uses the parent catalog when reporting a parent-course shelf change', () => {
    const messageService = { showMessage: vi.fn() };
    const service = new CoursesService(
      {} as any,
      { changeShelf: vi.fn().mockReturnValue(of({ shelf: {}, countChanged: 1 })) } as any,
      { ratingsUpdated$: of(undefined) } as any,
      messageService as any,
      { couchStateListener: vi.fn().mockReturnValue(of(undefined)) } as any,
      {} as any,
      {} as any,
      {} as any
    );
    service.local.courses = [ { _id: 'course-1', courseTitle: 'Local title' } ];
    service.parent.courses = [ { _id: 'course-1', courseTitle: 'Parent title' } ];

    service.courseAdmissionMany([ 'course-1' ], 'remove', true).subscribe();

    expect(messageService.showMessage).toHaveBeenCalledWith('Removed from myCourses: Parent title');
  });

  it('joins tag link docs onto a single course request', () => {
    const course = { _id: 'course-1', courseTitle: 'Local title' };
    const tags = [
      { _id: 'courses_math', name: 'Math', db: 'courses', docType: 'definition' },
      { _id: 'link-1', tagId: 'courses_math', linkId: 'course-1', db: 'courses', docType: 'link' }
    ];
    const service = new CoursesService(
      {
        get: vi.fn().mockReturnValue(of(course)),
        findAll: vi.fn().mockReturnValue(of([]))
      } as any,
      { get: vi.fn().mockReturnValue({ _id: 'user-1' }) } as any,
      {
        ratingsUpdated$: of(undefined),
        getRatings: vi.fn().mockReturnValue(of([])),
        createItemList: vi.fn().mockImplementation((items: any[]) => items.map(item => ({ ...item, rating: {} })))
      } as any,
      { showMessage: vi.fn() } as any,
      {
        couchStateListener: vi.fn().mockReturnValue(of(undefined)),
        getCouchState: vi.fn().mockReturnValue(of(tags))
      } as any,
      new TagsService({} as any, {} as any),
      {} as any,
      { usersListener: vi.fn().mockReturnValue(of([])), requestUserData: vi.fn() } as any
    );

    let courseDetail: any;
    service.courseUpdated$.subscribe(({ course: updatedCourse }) => courseDetail = updatedCourse);
    service.requestCourse({ courseId: 'course-1' });

    expect(courseDetail.tags.map((tag: any) => tag.name)).toEqual([ 'Math' ]);
  });
});
