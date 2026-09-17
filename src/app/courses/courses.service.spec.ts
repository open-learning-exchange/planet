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

  describe('canManageCourse', () => {
    const createService = (user: any, code = 'ole') => new CoursesService(
      {} as any,
      { get: () => user } as any,
      { ratingsUpdated$: of(undefined) } as any,
      {} as any,
      { couchStateListener: vi.fn().mockReturnValue(of(undefined)), configuration: { code } } as any,
      {} as any,
      {} as any,
      {} as any
    );
    const admin = { isUserAdmin: true, name: 'admin' };
    const teacher = { isUserAdmin: false, name: 'teacher' };

    it('allows an admin', () => {
      expect(createService(admin).canManageCourse({ creator: 'someone@ole' })).toBe(true);
    });

    it('allows the creator on this planet', () => {
      expect(createService(teacher).canManageCourse({ creator: 'teacher@ole' })).toBe(true);
    });

    it('denies the same name from another planet', () => {
      expect(createService(teacher).canManageCourse({ creator: 'teacher@otherplanet' })).toBe(false);
    });

    it('denies an unrelated user', () => {
      expect(createService(teacher).canManageCourse({ creator: 'someone@ole' })).toBe(false);
    });

    it('denies everyone in read only context', () => {
      expect(createService(admin).canManageCourse({ creator: 'admin@ole' }, { readOnly: true })).toBe(false);
    });

    it('denies when there is no course', () => {
      expect(createService(admin).canManageCourse(undefined)).toBe(false);
    });
  });
});
