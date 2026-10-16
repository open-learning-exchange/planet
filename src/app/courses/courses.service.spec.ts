import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { TagsService } from '@shared/forms/tags/tags.service';

import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  describe('course admission', () => {
    let messageService: { showMessage: ReturnType<typeof vi.fn>, showAlert: ReturnType<typeof vi.fn> };
    let userService: { shelf: { courseIds: string[] }, changeShelf: ReturnType<typeof vi.fn> };

    const createAdmissionService = (courseIds: string[]) => {
      messageService = { showMessage: vi.fn(), showAlert: vi.fn() };
      userService = {
        shelf: { courseIds },
        changeShelf: vi.fn().mockReturnValue(of({ shelf: {} }))
      };
      const service = new CoursesService(
        {} as any,
        userService as any,
        { ratingsUpdated$: of(undefined) } as any,
        messageService as any,
        { couchStateListener: vi.fn().mockReturnValue(of(undefined)) } as any,
        {} as any,
        {} as any,
        {} as any
      );
      service.local.courses = [ { _id: 'a', courseTitle: 'Course A' }, { _id: 'b', courseTitle: 'Course B' } ];
      return service;
    };

    it('leaves a course that is not on the shelf without writing or removing another course', () => {
      const service = createAdmissionService([ 'a', 'b' ]);
      let shelf: any;

      service.courseResignAdmission('c', 'resign').subscribe((result) => shelf = result);

      expect(userService.changeShelf).not.toHaveBeenCalled();
      expect(messageService.showMessage).not.toHaveBeenCalled();
      expect(shelf.courseIds).toEqual([ 'a', 'b' ]);
    });

    it('removes only the course being left', () => {
      const service = createAdmissionService([ 'a', 'b', 'c' ]);

      service.courseResignAdmission('b', 'resign').subscribe();

      expect(userService.changeShelf).toHaveBeenCalledWith([ 'b' ], 'courseIds', 'remove');
      expect(messageService.showMessage).toHaveBeenCalledWith('Removed from myCourses: Course B');
    });

    it('joins a course already on the shelf without writing a duplicate', () => {
      const service = createAdmissionService([ 'a' ]);

      service.courseResignAdmission('a', 'admission').subscribe();

      expect(userService.changeShelf).not.toHaveBeenCalled();
      expect(messageService.showMessage).not.toHaveBeenCalled();
    });

    it('names a course missing from the catalog with a fallback', () => {
      const service = createAdmissionService([]);

      service.courseResignAdmission('x', 'admission').subscribe();

      expect(userService.changeShelf).toHaveBeenCalledWith([ 'x' ], 'courseIds', 'add');
      expect(messageService.showMessage).toHaveBeenCalledWith('Course added to your dashboard: Selected course');
    });

    it('adds each selected course that is not on the shelf yet once', () => {
      const service = createAdmissionService([ 'a' ]);

      service.courseAdmissionMany([ 'a', 'b', 'b', 'c' ], 'add').subscribe();

      expect(userService.changeShelf).toHaveBeenCalledWith([ 'b', 'c' ], 'courseIds', 'add');
      expect(messageService.showMessage).toHaveBeenCalledWith('Added to myCourses: 2 courses ');
    });

    it('names the course that changed rather than the last one selected', () => {
      const service = createAdmissionService([ 'a' ]);

      service.courseAdmissionMany([ 'b', 'a' ], 'add').subscribe();

      expect(messageService.showMessage).toHaveBeenCalledWith('Added to myCourses: Course B ');
    });

    it('finishes without writing when no selected course changes', () => {
      const service = createAdmissionService([ 'a' ]);
      const next = vi.fn();

      service.courseAdmissionMany([ 'a' ], 'add').subscribe(next);

      expect(userService.changeShelf).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      expect(messageService.showMessage).not.toHaveBeenCalled();
    });

    it('reports a failed shelf write and passes the error on', () => {
      const service = createAdmissionService([ 'a' ]);
      userService.changeShelf.mockReturnValue(throwError({ status: 500 }));
      const error = vi.fn();

      service.courseResignAdmission('a', 'resign').subscribe({ error });

      expect(messageService.showAlert).toHaveBeenCalledWith('There was an error removing Course A');
      expect(messageService.showMessage).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalled();
    });

    it('uses the parent catalog when reporting a parent-course shelf change', () => {
      const service = createAdmissionService([ 'course-1' ]);
      service.local.courses = [ { _id: 'course-1', courseTitle: 'Local title' } ];
      service.parent.courses = [ { _id: 'course-1', courseTitle: 'Parent title' } ];

      service.courseAdmissionMany([ 'course-1' ], 'remove', true).subscribe();

      expect(messageService.showMessage).toHaveBeenCalledWith('Removed from myCourses: Parent title');
    });
  });

  const tags = [
    { _id: 'courses_math', name: 'Math', db: 'courses', docType: 'definition' },
    { _id: 'link-1', tagId: 'courses_math', linkId: 'course-1', db: 'courses', docType: 'link' }
  ];
  const createService = (stateService: any) => new CoursesService(
    {
      get: vi.fn().mockReturnValue(of({ _id: 'course-1', courseTitle: 'Title' })),
      findAll: vi.fn().mockReturnValue(of([]))
    } as any,
    { get: vi.fn().mockReturnValue({ _id: 'user-1' }) } as any,
    {
      ratingsUpdated$: of(undefined),
      getRatings: vi.fn().mockReturnValue(of([])),
      createItemList: vi.fn().mockImplementation((items: any[]) => items.map(item => ({ ...item, rating: {} })))
    } as any,
    { showMessage: vi.fn() } as any,
    { configuration: {}, ...stateService } as any,
    new TagsService({} as any, {} as any),
    {} as any,
    { usersListener: vi.fn().mockReturnValue(of([])), requestUserData: vi.fn() } as any
  );

  [ 'local', 'parent' ].forEach(planetField => {
    it(`attaches cached ${planetField} tags to a single course request`, () => {
      const tagsState = new Subject<any>();
      const stateService = {
        couchStateListener: vi.fn().mockImplementation((db: string) => db === 'tags' ? tagsState : of(undefined)),
        requestData: vi.fn()
      };
      const service = createService(stateService);
      tagsState.next({ newData: tags, db: 'tags', planetField });

      let courseDetail: any;
      service.courseUpdated$.subscribe(({ course }) => courseDetail = course);
      service.requestCourse({ courseId: 'course-1', parent: planetField === 'parent' });

      expect(courseDetail.tags.map((tag: any) => tag.name)).toEqual([ 'Math' ]);
      expect(stateService.requestData).not.toHaveBeenCalled();
    });
  });

  it('emits a course before tags load, requests tags until they arrive, and sends them without another course update', () => {
    const tagsState = new Subject<any>();
    const stateService = {
      couchStateListener: vi.fn().mockImplementation((db: string) => db === 'tags' ? tagsState : of(undefined)),
      requestData: vi.fn()
    };
    const service = createService(stateService);
    const courseUpdates: any[] = [];
    const tagUpdates: any[] = [];
    service.courseUpdated$.subscribe(({ course }) => courseUpdates.push(course));
    service.courseTagsListener$().subscribe(update => tagUpdates.push(update));

    service.requestCourse({ courseId: 'course-1' });
    service.requestCourse({ courseId: 'course-1' });
    tagsState.next({ newData: tags, db: 'tags', planetField: 'local' });

    expect(courseUpdates.length).toBe(2);
    expect(courseUpdates.map(course => course.tags)).toEqual([ [], [] ]);
    expect(stateService.requestData).toHaveBeenCalledTimes(2);
    expect(stateService.requestData).toHaveBeenCalledWith('tags', 'local');
    expect(tagUpdates.map(({ courseId, tags: courseTags }) => [ courseId, courseTags.map((tag: any) => tag.name) ]))
      .toEqual([ [ 'course-1', [ 'Math' ] ] ]);

    service.requestCourse({ courseId: 'course-1' });

    expect(stateService.requestData).toHaveBeenCalledTimes(2);
  });

  describe('canManageCourse', () => {
    const createPermissionService = (user: any, code = 'ole') => new CoursesService(
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
      expect(createPermissionService(admin).canManageCourse({ creator: 'someone@ole' })).toBe(true);
    });

    it('allows the creator on this planet', () => {
      expect(createPermissionService(teacher).canManageCourse({ creator: 'teacher@ole' })).toBe(true);
    });

    it('denies the same name from another planet', () => {
      expect(createPermissionService(teacher).canManageCourse({ creator: 'teacher@otherplanet' })).toBe(false);
    });

    it('denies an unrelated user', () => {
      expect(createPermissionService(teacher).canManageCourse({ creator: 'someone@ole' })).toBe(false);
    });

    it('denies everyone in read only context', () => {
      expect(createPermissionService(admin).canManageCourse({ creator: 'admin@ole' }, { readOnly: true })).toBe(false);
    });

    it('denies when there is no course', () => {
      expect(createPermissionService(admin).canManageCourse(undefined)).toBe(false);
    });
  });
});
