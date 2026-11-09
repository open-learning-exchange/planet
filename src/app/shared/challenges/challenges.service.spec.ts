import { NEVER, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChallengesService } from './challenges.service';
import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';

describe('ChallengesService', () => {
  const challenge = {
    _id: 'reto', type: 'challenge', title: 'Reto', startsAt: '2026-10-01', endsAt: '2026-10-31',
    tasks: [
      { id: 'join', type: 'course_join', targetId: 'course-1', reward: 0 },
      { id: 'survey', type: 'survey_complete', targetId: 'survey-1', courseId: 'course-1', reward: 1 }
    ]
  };
  const referenceDate = new Date(2026, 9, 15);
  let couchService: any;
  let userService: any;
  let service: ChallengesService;

  beforeEach(() => {
    couchService = { post: vi.fn().mockReturnValue(of({ docs: [ challenge ] })) };
    userService = { get: vi.fn().mockReturnValue({ name: 'maria' }), userChange$: new Subject() };
    service = new ChallengesService(couchService, new DialogGuardService({ start: vi.fn(), stop: vi.fn() } as any), userService);
  });

  it('reads challenges from the challenges database', () => {
    let active: any;
    service.getActiveChallenge(referenceDate).subscribe(result => active = result);

    expect(couchService.post).toHaveBeenCalledWith('challenges/_find', expect.objectContaining({ selector: { type: 'challenge' } }));
    expect(active).toEqual(expect.objectContaining({
      _id: 'reto', tasks: expect.arrayContaining([ expect.objectContaining({ id: 'join' }) ])
    }));
  });

  it('treats a missing database as no challenges, and passes other read errors on to all but announcements', () => {
    const read = (status: number) => {
      couchService.post.mockReturnValue(throwError({ status }));
      const results: any = { active: 'unset' };
      service.getChallenges().subscribe({ next: challenges => results.challenges = challenges, error: error => results.error = error });
      service.getActiveChallenge(referenceDate).subscribe(active => results.active = active);
      return results;
    };

    expect(read(404)).toEqual({ challenges: [], active: undefined });
    expect(read(500)).toEqual({ error: { status: 500 }, active: undefined });
  });

  it('is not active when disabled, without tasks, or with a ":" in its id', () => {
    const active = (changes: any) => service.isChallengeActive(service.normalizeChallenge({ ...challenge, ...changes }), referenceDate);

    expect(active({})).toBe(true);
    expect(active({ enabled: false })).toBe(false);
    expect(active({ tasks: [] })).toBe(false);
    expect(active({ _id: 'reto:x' })).toBe(false);
  });

  it('finds the challenge for a course through a task target or a survey step course', () => {
    couchService.post.mockReturnValue(of({ docs: [ { ...challenge, tasks: [ challenge.tasks[1] ] } ] }));
    let forCourse: any;
    let forOther: any = 'unset';
    let forNone: any = 'unset';
    service.getActiveChallengeForCourse('course-1', referenceDate).subscribe(result => forCourse = result);
    service.getActiveChallengeForCourse('course-2', referenceDate).subscribe(result => forOther = result);
    service.getActiveChallengeForCourse(undefined, referenceDate).subscribe(result => forNone = result);

    expect(forCourse?._id).toBe('reto');
    expect(forOther).toBeUndefined();
    expect(forNone).toBeUndefined();
  });

  it('gives each user one notification per challenge', () => {
    const notification = service.createChallengeNotification('org.couchdb.user:maria', service.normalizeChallenge(challenge as any), 0);

    expect(notification).toEqual(expect.objectContaining({ _id: 'challenge:reto:org.couchdb.user:maria', challengeId: 'reto' }));
  });

  it('normalizes limits and drops tasks the engine cannot count', () => {
    const normalized = service.normalizeChallenge({
      ...challenge,
      tasks: [
        { id: 'voice', type: 'voice_post', reward: '2', countBy: 'day', maxCount: 5.7, requiredCount: '2' },
        { id: 'join', type: 'course_join', targetId: 'course-1', requiredCount: 2 }, { id: 'untargeted', type: 'course_join' },
        { id: 'voice', type: 'voice_post' }, { id: 'complete', type: 'voice_post' }, { id: 'a:b', type: 'voice_post' },
        { id: 'login', type: 'login' }, { type: 'voice_post' }
      ]
    } as any);

    expect(normalized.tasks).toEqual([
      { id: 'voice', type: 'voice_post', reward: 2, countBy: 'day', maxCount: 5, requiredCount: 2 },
      { id: 'join', type: 'course_join', targetId: 'course-1', reward: 0, countBy: 'each' }
    ]);
  });

  it('opens one announcement at a time, and none without an active challenge', () => {
    const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => NEVER }) } as any;

    service.openChallengeDialogOnce(dialog, of(undefined)).subscribe();
    service.openChallengeDialogOnce(dialog, of(challenge as any)).subscribe();
    service.openChallengeDialogOnce(dialog, of(challenge as any)).subscribe();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: challenge }));
  });

  it('announces a challenge once per login', () => {
    const dialog = { open: vi.fn().mockReturnValue({ afterClosed: () => of(undefined) }) } as any;

    service.announceOnce(dialog, of(challenge as any)).subscribe();
    userService.userChange$.next({ name: 'maria' });
    service.announceOnce(dialog, of(challenge as any)).subscribe();
    userService.userChange$.next({ name: '' });
    service.announceOnce(dialog, of(challenge as any)).subscribe();

    expect(dialog.open).toHaveBeenCalledTimes(2);
  });

  it('reads date-only boundaries as whole local calendar days west of UTC', () => {
    const timezone = process.env.TZ;
    process.env.TZ = 'America/Guatemala';
    try {
      const active = (time: Date) => service.isChallengeActive(service.normalizeChallenge(challenge as any), time);

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
