import { TestBed } from '@angular/core/testing';
import { RedirectCommand, Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { CouchService } from '../../shared/couchdb.service';
import { UserService } from '../../shared/user.service';
import { StateService } from '../../shared/state.service';
import { courseSubmissionsResolver, courseSubmissionsRerun } from './courses-submissions.resolver';

describe('courseSubmissionsResolver', () => {
  let routerMock: any;
  let couchServiceMock: any;
  let userServiceMock: any;
  let stateServiceMock: any;
  const localRedirect = { url: '/courses' };
  const parentRedirect = { url: '/manager/courses' };
  const course = { _id: 'course_123', courseTitle: 'Math 101', creator: 'teacher@ole' };

  const routeOf = (
    { id = 'course_123', submissionId = null, questionNum = null, data = {} }:
    { id?: string | null, submissionId?: string | null, questionNum?: string | null, data?: any } = {}
  ) => {
    const params: any = { id, submissionId, questionNum };
    return { data, paramMap: { get: (key: string) => params[key] === undefined ? null : params[key] } } as any;
  };

  const resolve = (route: any) => {
    const result = TestBed.runInInjectionContext(() => courseSubmissionsResolver(route, null as any));
    if (result instanceof RedirectCommand) {
      return result;
    }
    let value: any;
    (result as Observable<any>).subscribe(emitted => value = emitted);
    return value;
  };

  const expectRedirectTo = (result: any, url: any) => {
    expect(result).toBeInstanceOf(RedirectCommand);
    expect(result.redirectTo).toBe(url);
  };

  beforeEach(() => {
    routerMock = { parseUrl: vi.fn((url: string) => url === '/courses' ? localRedirect : parentRedirect) };
    couchServiceMock = {
      get: vi.fn((db: string) => of(db.startsWith('courses/') ?
        course :
        { _id: 'submission_1', parentId: 'exam_1@course_123' }))
    };
    userServiceMock = { get: vi.fn().mockReturnValue({ isUserAdmin: true, name: 'admin' }) };
    stateServiceMock = { configuration: { code: 'ole' } };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: CouchService, useValue: couchServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: StateService, useValue: stateServiceMock }
      ]
    });
  });

  it('should resolve the course for an admin', () => {
    expect(resolve(routeOf())).toBe(course);
  });

  it('should resolve the course for the exact creator identity', () => {
    userServiceMock.get.mockReturnValue({ isUserAdmin: false, name: 'teacher' });
    expect(resolve(routeOf())).toBe(course);
  });

  it('should redirect when only the name matches a creator on a different planet', () => {
    userServiceMock.get.mockReturnValue({ isUserAdmin: false, name: 'teacher' });
    couchServiceMock.get.mockReturnValue(of({ ...course, creator: 'teacher@otherplanet' }));
    expectRedirectTo(resolve(routeOf()), localRedirect);
  });

  it('should redirect to the manager list in parent context without fetching', () => {
    expectRedirectTo(resolve(routeOf({ data: { parent: true } })), parentRedirect);
    expect(couchServiceMock.get).not.toHaveBeenCalled();
  });

  it('should redirect without fetching when the course id is missing', () => {
    expectRedirectTo(resolve(routeOf({ id: null })), localRedirect);
    expect(couchServiceMock.get).not.toHaveBeenCalled();
  });

  it('should redirect when the course cannot be fetched', () => {
    couchServiceMock.get.mockReturnValue(throwError(() => 'not found'));
    expectRedirectTo(resolve(routeOf()), localRedirect);
  });

  it('should not fetch a submission when the route carries no submission id', () => {
    resolve(routeOf());
    expect(couchServiceMock.get).toHaveBeenCalledTimes(1);
    expect(couchServiceMock.get).toHaveBeenCalledWith('courses/course_123');
  });

  it('should resolve the course when the submission belongs to it', () => {
    expect(resolve(routeOf({ submissionId: 'submission_1' }))).toBe(course);
    expect(couchServiceMock.get).toHaveBeenCalledWith('submissions/submission_1');
  });

  it('should redirect when the submission belongs to a different course', () => {
    couchServiceMock.get.mockImplementation((db: string) => of(db.startsWith('courses/') ?
      course :
      { _id: 'submission_1', parentId: 'exam_1@other_course' }));
    expectRedirectTo(resolve(routeOf({ submissionId: 'submission_1' })), localRedirect);
  });

  it('should redirect when the submission has no course association', () => {
    couchServiceMock.get.mockImplementation((db: string) => of(db.startsWith('courses/') ?
      course :
      { _id: 'submission_1' }));
    expectRedirectTo(resolve(routeOf({ submissionId: 'submission_1' })), localRedirect);
  });

  it('should redirect when a course id is only a suffix of the submission association', () => {
    couchServiceMock.get.mockImplementation((db: string) => of(db.startsWith('courses/') ?
      course :
      { _id: 'submission_1', parentId: 'exam_1@not_course_123' }));
    expectRedirectTo(resolve(routeOf({ submissionId: 'submission_1' })), localRedirect);
  });

  it('should redirect when the submission cannot be fetched', () => {
    couchServiceMock.get.mockImplementation((db: string) =>
      db.startsWith('courses/') ? of(course) : throwError(() => 'not found'));
    expectRedirectTo(resolve(routeOf({ submissionId: 'submission_1' })), localRedirect);
  });

  describe('courseSubmissionsRerun', () => {

    it('should not rerun when only a matrix param such as questionNum changes', () => {
      const from = routeOf({ submissionId: 'submission_1', questionNum: '1' });
      const to = routeOf({ submissionId: 'submission_1', questionNum: '2' });
      expect(from.paramMap.get('questionNum')).not.toBe(to.paramMap.get('questionNum'));
      expect(courseSubmissionsRerun(from, to)).toBe(false);
    });

    it('should rerun when the course changes', () => {
      expect(courseSubmissionsRerun(routeOf(), routeOf({ id: 'other_course' }))).toBe(true);
    });

    it('should rerun when the submission changes', () => {
      const from = routeOf({ submissionId: 'submission_1' });
      const to = routeOf({ submissionId: 'submission_2' });
      expect(courseSubmissionsRerun(from, to)).toBe(true);
    });
  });
});
