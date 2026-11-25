import { EMPTY, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { DialogGuardService } from '@shared/dialogs/dialog-guard.service';

import { ChallengesAnnouncementDialogComponent } from './challenges-announcement-dialog.component';
import { ChallengesService } from './challenges.service';

describe('ChallengesAnnouncementDialogComponent', () => {
  const challenge = { _id: 'reto', goal: 100, tasks: [ { id: 'test', type: 'exam_pass', targetId: 'exam-1', reward: 2 } ] };
  let progressService: any;

  const createComponent = () => {
    const userService = { userChange$: EMPTY };
    const challengesService = new ChallengesService({} as any, new DialogGuardService({} as any), userService as any);
    const component = new ChallengesAnnouncementDialogComponent({} as any, challengesService, progressService, challenge as any);
    component.ngOnInit();
    return component;
  };

  beforeEach(() => {
    const incomplete = { tasks: [], earned: 0, complete: false, succeeded: false };
    progressService = {
      canTakePart: vi.fn().mockReturnValue(true),
      refresh: vi.fn().mockReturnValue(of({ progress: { ...incomplete, earned: 3 }, completedNow: false })),
      userProgress: vi.fn().mockReturnValue(incomplete),
      groupEarned: vi.fn().mockReturnValue(of(40))
    };
  });

  it('shows the learner\'s progress and the group total, and asks for a reminder while unfinished', () => {
    const component = createComponent();

    expect(component.progress.earned).toBe(3);
    expect(component.groupEarned).toBe(40);
    expect(component.needsReminder()).toBe(true);
  });

  it('falls back to empty progress, and sends no reminder, when progress can\'t load', () => {
    progressService.refresh.mockReturnValue(throwError({ status: 500 }));
    progressService.groupEarned.mockReturnValue(throwError({ status: 500 }));

    const component = createComponent();

    expect(component.progress).toEqual(expect.objectContaining({ earned: 0 }));
    expect(component.groupEarned).toBe(0);
    expect(component.needsReminder()).toBe(false);
  });
});
