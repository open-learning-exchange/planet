import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChallengesService } from './challenges.service';

describe('ChallengesService', () => {
  const challenge = {
    id: 'reto', title: 'Reto', courseId: 'course-1', surveyExamId: 'survey-1', startsAt: '2026-10-01', endsAt: '2026-10-31'
  };
  const referenceDate = new Date(2026, 9, 15);
  let couchService: any;
  let service: ChallengesService;

  beforeEach(() => {
    couchService = { get: vi.fn().mockReturnValue(of({ _id: 'local@parent', challenges: [ challenge ] })) };
    service = new ChallengesService({ configuration: { code: 'local', parentCode: 'parent' } } as any, couchService);
  });

  it('reads challenges from the planet services doc', () => {
    let active: any;
    service.getActiveChallenge(referenceDate).subscribe(result => active = result);

    expect(couchService.get).toHaveBeenCalledWith('teams/local@parent');
    expect(active).toEqual(expect.objectContaining({ id: 'reto', courseId: 'course-1' }));
    expect(service.activeChallengeIn({ challenges: [ challenge ] }, referenceDate)).toEqual(active);
  });

  it('has no active challenge when the services doc does not exist', () => {
    couchService.get.mockReturnValue(throwError({ status: 404 }));
    let active: any = 'unset';
    service.getActiveChallenge(referenceDate).subscribe(result => active = result);

    expect(active).toBeUndefined();
  });
});
