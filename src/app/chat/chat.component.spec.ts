import { Subject, of } from 'rxjs';
import { vi } from 'vitest';

import { ChatComponent } from './chat.component';

describe('ChatComponent', () => {
  let component: ChatComponent;
  let navigationService: { back: ReturnType<typeof vi.fn> };
  let originalHistoryState: unknown;

  beforeEach(() => {
    originalHistoryState = history.state;
    navigationService = { back: vi.fn() };
    const chatService = {
      currentChatAIProvider$: new Subject(),
      listAIProviders: vi.fn(() => of([])),
      toggleAIServiceSignal: vi.fn()
    };
    component = new ChatComponent(chatService as any, navigationService as any);
  });

  afterEach(() => {
    history.replaceState(originalHistoryState, '');
  });

  it('uses the persisted return route as the cold-start fallback', () => {
    history.replaceState({ returnState: { route: 'myDashboard' } }, '');

    component.goBack();

    expect(navigationService.back).toHaveBeenCalledWith([ 'myDashboard' ]);
  });

  it('falls back to the home route without a persisted return route', () => {
    history.replaceState({}, '');

    component.goBack();

    expect(navigationService.back).toHaveBeenCalledWith([ '/' ]);
  });
});
