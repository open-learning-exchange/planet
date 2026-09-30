import { Subject, of } from 'rxjs';
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
