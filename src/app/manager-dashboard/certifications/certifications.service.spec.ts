import { CertificationsService } from './certifications.service';

describe('CertificationsService', () => {
  const service = new CertificationsService({} as any, {} as any, {} as any);
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
});
