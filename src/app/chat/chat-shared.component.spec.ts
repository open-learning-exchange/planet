import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { ChatSharedComponent } from './chat-shared.component';

const open = (answer: any) => {
  const chatService = { getSharedChat: vi.fn(() => answer) };
  const route = { snapshot: { paramMap: { get: () => 'share-1' } } };
  const component = new ChatSharedComponent(chatService as any, route as any);
  component.ngOnInit();
  return { component, chatService };
};

describe('ChatSharedComponent', () => {
  it('opens the share named in the route', () => {
    const sharedChat = { title: 'Fractions', turns: [], totalTurns: 0, live: false, sharedDate: 1 };
    const { component, chatService } = open(of(sharedChat));

    expect(chatService.getSharedChat).toHaveBeenCalledWith('share-1');
    expect(component.sharedChat).toBe(sharedChat);
  });

  it('tells a share it can\'t read apart from a failed request', () => {
    expect(open(throwError(() => ({ status: 404 }))).component).toMatchObject({ sharedChat: null, loadFailed: false });
    expect(open(throwError(() => ({ status: 502 }))).component).toMatchObject({ sharedChat: null, loadFailed: true });
  });
});
