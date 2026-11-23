import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, NEVER, of, Subject } from 'rxjs';

import { AiChatService } from '@shared/ai/ai-chat.service';
import { UserService } from '@shared/auth/user.service';
import { StateService } from '@shared/state.service';
import { ChatStreamMessage } from '../chat.model';
import { ChatWindowComponent } from './chat-window.component';

describe('ChatWindowComponent streaming', () => {
  let stream: Subject<ChatStreamMessage>;
  let selectedConversation: BehaviorSubject<object | null>;

  const sendTurn = (openConversation?: object) => {
    stream = new Subject<ChatStreamMessage>();
    selectedConversation = new BehaviorSubject<object | null>(null);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AiChatService,
          useValue: {
            streamPrompt: () => stream,
            selectedConversationId$: selectedConversation,
            newChatSelected$: NEVER,
            toggleAIService$: NEVER,
            listAIProviders: () => of([ { name: 'openai' } ]),
            setChatAIProvider: () => {},
            sendNewChatAddedSignal: () => {},
            getConversation: () => of({ conversations: [ { id: 'b1', query: 'Earlier question', response: 'Earlier answer' } ] })
          }
        },
        { provide: StateService, useValue: { configuration: { streaming: true } } },
        { provide: UserService, useValue: { get: () => ({ name: 'member' }) } }
      ]
    });
    TestBed.overrideComponent(ChatWindowComponent, { set: { template: '', imports: [] } });
    const component = TestBed.createComponent(ChatWindowComponent).componentInstance;
    component.ngOnInit();
    vi.spyOn(component, 'scrollTo').mockImplementation(() => {});
    if (openConversation) {
      selectedConversation.next(openConversation);
    }
    component.promptForm.controls.prompt.setValue('Hi');
    component.submitPrompt();
    stream.next({ type: 'partial', response: 'Hel' });
    return component;
  };

  it('stops the streaming turn when another conversation is selected', () => {
    const component = sendTurn();

    selectedConversation.next({ _id: 'b' });
    stream.next({ type: 'partial', response: 'lo' });

    expect(stream.observed).toBe(false);
    expect(component.conversations).toEqual([ { id: 'b1', query: 'Earlier question', response: 'Earlier answer' } ]);
    expect(component.spinnerOn).toBe(true);
  });

  it('keeps streaming when the open conversation is selected again', () => {
    const component = sendTurn({ _id: 'b' });

    selectedConversation.next({ _id: 'b' });
    stream.next({ type: 'partial', response: 'lo' });

    expect(stream.observed).toBe(true);
    expect(component.conversations[component.conversations.length - 1]).toEqual(
      expect.objectContaining({ query: 'Hi', response: 'Hello' })
    );
  });

  it('shows a stream error after the partial reply of the turn that sent it', () => {
    const component = sendTurn();

    stream.error(new Error('AI provider failed'));

    expect(component.conversations).toEqual([
      expect.objectContaining({ query: 'Hi', response: 'Hel\n\nError: AI provider failed', error: true })
    ]);
    expect(component.spinnerOn).toBe(true);
  });
});
