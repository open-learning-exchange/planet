import { NEVER, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChallengesService } from './challenges.service';
import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';

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
    service = new ChallengesService(stateService, couchService, new DialogGuardService({ start: vi.fn(), stop: vi.fn() } as any));
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

  it('passes on other read failures instead of reporting no challenges', () => {
    couchService.get.mockReturnValue(throwError({ status: 500 }));
    const next = vi.fn();
    const error = vi.fn();
    service.getChallenges().subscribe({ next, error });

    expect(next).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith({ status: 500 });
  });

  it('shows no announcement when the services doc cannot be read', () => {
    couchService.get.mockReturnValue(throwError({ status: 500 }));
    const next = vi.fn();
    const error = vi.fn();
    service.getActiveChallenge(referenceDate).subscribe({ next, error });

    expect(next).toHaveBeenCalledWith(undefined);
    expect(error).not.toHaveBeenCalled();
  });

  it('opens one announcement at a time, and none without an active challenge', () => {
    const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => NEVER }) } as any;

    service.openChallengeDialogOnce(dialog, of(undefined)).subscribe();
    service.openChallengeDialogOnce(dialog, of(challenge as any)).subscribe();
    service.openChallengeDialogOnce(dialog, of(challenge as any)).subscribe();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: challenge }));
  });

  it('reads date-only boundaries as whole local calendar days west of UTC', () => {
    const timezone = process.env.TZ;
    process.env.TZ = 'America/Guatemala';
    try {
      const active = (time: Date) => service.isChallengeActive(service.normalizeChallenge(challenge), time);

      expect(active(new Date(2026, 8, 30, 23))).toBe(false);
      expect(active(new Date(2026, 9, 1))).toBe(true);
      expect(active(new Date(2026, 9, 31, 23))).toBe(true);
      expect(active(new Date(2026, 10, 1))).toBe(false);
      expect(service.parseDateBoundary('2026-10-31T12:00:00Z', 'end')).toEqual(new Date(Date.UTC(2026, 9, 31, 12)));
      expect(service.parseDateBoundary(Date.UTC(2026, 9, 31, 12) as any, 'end')).toEqual(new Date(Date.UTC(2026, 9, 31, 12)));
    } finally {
      if (timezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = timezone;
      }
    }
  });
});
