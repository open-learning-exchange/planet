import { FeedbackViewComponent } from './feedback-view.component';
import { vi } from 'vitest';

describe('FeedbackViewComponent', () => {
  it('unwinds history with the feedback list as the cold-start fallback', () => {
    const navigationService = { back: vi.fn() };
    const component = new FeedbackViewComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      navigationService as any
    );

    component.goBack();

    expect(navigationService.back).toHaveBeenCalledWith([ '/feedback' ]);
  });
});
