import { of } from 'rxjs';

import { CertificationsService } from './certifications.service';

describe('CertificationsService', () => {
  const service = new CertificationsService({} as any);
  const user = { _id: 'learner' };

  it('requires a passed progress record for every current step', () => {
    const course = {
      doc: { steps: [ {}, {} ] },
      progress: [
        { userId: 'learner', stepNum: 1, passed: true },
        { userId: 'learner', stepNum: 1, passed: true },
        { userId: 'learner', stepNum: 3, passed: true },
        { userId: 'another-learner', stepNum: 2, passed: true }
      ]
    };

    expect(service.isCourseCompleted(course, user)).toBe(false);

    course.progress.push({ userId: 'learner', stepNum: 2, passed: true });

    expect(service.isCourseCompleted(course, user)).toBe(true);
  });

  it('certifies only users who completed every course the certification names', () => {
    const courses = [ { _id: 'c1', doc: { steps: [ {} ] } }, { _id: 'c2', doc: { steps: [ {} ] } } ];
    const progress = [
      { courseId: 'c1', userId: 'learner', stepNum: 1, passed: true },
      { courseId: 'c2', userId: 'learner', stepNum: 1, passed: true },
      { courseId: 'c1', userId: 'another-learner', stepNum: 1, passed: true }
    ];
    const users = [ user, { _id: 'another-learner' } ];

    expect(service.certifiedUsers({ courseIds: [ 'c1', 'c2' ] }, courses, progress, users)).toEqual([ user ]);
  });

  it('certifies nobody when a course the certification names was deleted', () => {
    const courses = [ { _id: 'c1', doc: { steps: [ {} ] } } ];
    const progress = [ { courseId: 'c1', userId: 'learner', stepNum: 1, passed: true } ];

    expect(service.certifiedUsers({ courseIds: [ 'deleted' ] }, courses, progress, [ user ])).toEqual([]);
    expect(service.certifiedUsers({ courseIds: [ 'c1', 'deleted' ] }, courses, progress, [ user ])).toEqual([]);
    expect(service.certifiedUsers({ courseIds: [] }, courses, progress, [ user ])).toEqual([]);
  });

  it('reports the course ids that are deleted or never existed', () => {
    const couchService = { post: vi.fn(() => of({ rows: [
      { key: 'live', value: { rev: '1-a' } },
      { key: 'deleted', value: { rev: '2-b', deleted: true } },
      { key: 'missing', error: 'not_found' }
    ] })) };
    let deletedCourseIds;

    new CertificationsService(couchService as any).deletedCourseIds([ 'live', 'deleted', 'missing' ])
      .subscribe(ids => deletedCourseIds = ids);

    expect(deletedCourseIds).toEqual([ 'deleted', 'missing' ]);
  });

  it('certifies nobody for a course with no steps', () => {
    const courses = [ { _id: 'empty', doc: { steps: [] } } ];

    expect(service.certifiedUsers({ courseIds: [ 'empty' ] }, courses, [], [ user ])).toEqual([]);
  });
});
