import { EMPTY } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';

import { ChallengesAnnouncementComponent } from './challenges-announcement.component';
import { ChallengesService } from './challenges.service';

describe('ChallengesAnnouncementComponent', () => {
  const challengesService = new ChallengesService({} as any, new DialogGuardService({} as any), { userChange$: EMPTY } as any);
  const challenge = challengesService.normalizeChallenge({
    _id: 'reto', goal: 100, tasks: [ { id: 'test', type: 'exam_pass', targetId: 'exam-1', reward: 2 } ]
  });

  it('opens the course step that holds a test, and asks to be closed', () => {
    const router = { navigate: vi.fn() };
    const coursesService = { local: { courses: [ { _id: 'course-1', steps: [ {}, { exam: { _id: 'exam-1' } } ] } ] } };
    const component = new ChallengesAnnouncementComponent(router as any, coursesService as any, {} as any, challengesService, {} as any);
    component.challenge = challenge;
    const leave = vi.fn();
    component.leave.subscribe(leave);

    component.openTestStep(challenge.tasks[0]);

    expect(router.navigate).toHaveBeenCalledWith([ '/courses/view/course-1/step/2' ]);
    expect(leave).toHaveBeenCalled();
  });
});
