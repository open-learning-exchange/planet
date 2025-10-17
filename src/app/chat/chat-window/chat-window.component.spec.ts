import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';

import { ChatWindowComponent } from './chat-window.component';
import { ChatService, ChatStreamMessage } from '../../shared/chat.service';

describe('ChatWindowComponent stream helpers', () => {
  let component: ChatWindowComponent;

  beforeEach(() => {
    const chatServiceStub = {
      listAIProviders: () => ({ subscribe: () => undefined })
    } as unknown as ChatService;
    const userServiceStub = {
      get: () => ({ name: 'tester' })
    } as any;
    const stateServiceStub = {
      configuration: { streaming: true }
    } as any;
    const cdrStub = {
      markForCheck: () => undefined
    } as unknown as ChangeDetectorRef;

    component = new ChatWindowComponent(cdrStub, chatServiceStub, new FormBuilder(), stateServiceStub, userServiceStub);
    component.conversations = [ { id: '1', query: 'Hi', response: '' } ];
  });

  it('normalizes nested stream payloads to text', () => {
    const message: ChatStreamMessage = {
      type: 'partial',
      response: {
        content: [
          { text: 'Hello' },
          { text: ' ' },
          { logs: 'world' }
        ]
      }
    };

    const text = (component as any).extractResponseSegment(message);
    expect(text).toBe('Hello world');
  });

  it('prefers completionText for final messages', () => {
    const message: ChatStreamMessage = {
      type: 'final',
      completionText: 'Goodbye',
      response: 'ignored'
    };

    const text = (component as any).extractResponseSegment(message);
    expect(text).toBe('Goodbye');
  });
});
