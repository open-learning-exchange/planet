import { of } from 'rxjs';
import { vi } from 'vitest';

import { CoursesService } from './courses.service';

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
});
