import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChallengesService } from './challenges.service';
import { DialogGuardService } from '../dialogs/dialog-guard.service';

describe('ChallengesService', () => {
  const challenge = {
    id: 'reto', title: 'Reto', courseId: 'course-1', surveyExamId: 'survey-1', startsAt: '2026-10-01', endsAt: '2026-10-31'
  };
  const referenceDate = new Date(2026, 9, 15);
  let couchService: any;
  let service: ChallengesService;

  beforeEach(() => {
    couchService = { get: vi.fn().mockReturnValue(of({ _id: 'local@parent', challenges: [ challenge ] })) };
    const stateService = { configuration: { code: 'local', parentCode: 'parent' } } as any;
    service = new ChallengesService(stateService, couchService, new DialogGuardService());
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

  it('opens one announcement at a time, and none without an active challenge', () => {
    const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => NEVER }) } as any;

    service.openChallengeDialogOnce(dialog, of(undefined)).subscribe();
    service.openChallengeDialogOnce(dialog, of(challenge as any)).subscribe();
    service.openChallengeDialogOnce(dialog, of(challenge as any)).subscribe();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: challenge }));
  });
});
