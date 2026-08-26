import { FormBuilder } from '@angular/forms';
import { vi } from 'vitest';

import { ExamsViewComponent } from './exams-view.component';

describe('ExamsViewComponent', () => {
  it('leaves without opening a submission when a survey has no valid questions', () => {
    const router = { navigate: vi.fn() };
    const route = {
      snapshot: {
        data: {},
        paramMap: { has: vi.fn().mockReturnValue(false) },
        params: {}
      }
    };
    const submissionsService = { openSubmission: vi.fn() };
    const planetMessageService = { showAlert: vi.fn() };
    const component = new ExamsViewComponent(
      router as any,
      route as any,
      {} as any,
      submissionsService as any,
      { get: vi.fn().mockReturnValue({}) } as any,
      {} as any,
      planetMessageService as any,
      {} as any,
      {} as any,
      new FormBuilder(),
      {} as any
    );
    component.examType = 'survey';

    component.setTakingExam({ questions: 'not-an-array' }, 'survey-1', 'survey');

    expect(submissionsService.openSubmission).not.toHaveBeenCalled();
    expect(planetMessageService.showAlert).toHaveBeenCalledWith('This survey has no questions and is not available');
    expect(router.navigate).toHaveBeenCalled();
  });
});
